"""BeatMind's Stripe catalog, resolved by price lookup key.

Price IDs are never hard-coded: each plan and package is found by its lookup key, and what it
includes comes from its Stripe PRODUCT metadata (tier, included_tracks, included_cloud, mixmind;
packages: kind, credits, pack_id). The result is cached in-process for CATALOG_TTL_SECONDS.
"""

import logging
import os
import re
import threading
import time

import stripe

log = logging.getLogger("beatmind.catalog")

PLANS = ('starter', 'pro', 'studio', 'mixmind', 'starter_mixmind', 'pro_mixmind')
MIXMIND_PLANS = ('mixmind', 'starter_mixmind', 'pro_mixmind')
BEATMIND_PLANS = ('starter', 'pro', 'studio', 'starter_mixmind', 'pro_mixmind')
INTERVALS = {'month': 'monthly', 'year': 'yearly'}
PLAN_NAMES = {'starter': 'Starter', 'pro': 'Pro', 'studio': 'Studio', 'mixmind': 'MixMind',
              'starter_mixmind': 'Starter + MixMind', 'pro_mixmind': 'Pro + MixMind'}
PACK_KEYS = ('beatmind_pack_tracks_10', 'beatmind_pack_tracks_25', 'beatmind_pack_tracks_60',
             'beatmind_pack_cloud_10', 'beatmind_pack_cloud_50')
TTL_SECONDS = 600
RETRY_SECONDS = 60

_lock = threading.Lock()
_cache: tuple[float, dict] | None = None
_refreshing = False


def lookup_key(plan, interval):
    base = 'mixmind' if plan == 'mixmind' else 'beatmind_' + plan
    return f"{base}_{INTERVALS[interval]}"


PLAN_KEYS = {lookup_key(plan, interval): (plan, interval) for plan in PLANS for interval in INTERVALS}


def mixmind_sales_enabled():
    return os.getenv('MIXMIND_SALES_ENABLED', 'false').lower() == 'true'


def _field(obj, key, default=None):
    try:
        value = obj[key]
    except (KeyError, TypeError, IndexError):
        return default
    return default if value is None else value


def _int(value):
    try:
        return max(0, int(value))
    except (TypeError, ValueError):
        return None


def entitlements(product):
    """What a subscription product includes, from its metadata. None when the metadata is incomplete."""
    metadata = _field(product, 'metadata', {})
    tracks, cloud = _int(_field(metadata, 'included_tracks')), _int(_field(metadata, 'included_cloud'))
    tier = _field(metadata, 'tier')
    if tier is None or tracks is None or cloud is None:
        return None
    return {'tier': str(tier), 'included_tracks': tracks, 'included_cloud': cloud,
            'mixmind': str(_field(metadata, 'mixmind', 'false')).lower() == 'true'}


def _plan_entry(price):
    plan, interval = PLAN_KEYS[price['lookup_key']]
    included = entitlements(_field(price, 'product'))
    recurring = _field(price, 'recurring', {})
    if not included or _field(recurring, 'interval') != interval:
        log.error("Stripe price %s has incomplete plan metadata; not offered", price['lookup_key'])
        return None
    return {'plan': plan, 'interval': interval, 'lookup_key': price['lookup_key'], 'price_id': price['id'],
            'product_id': _field(_field(price, 'product'), 'id'), 'amount': price['unit_amount'],
            'currency': price['currency'], 'name': PLAN_NAMES[plan], **included}


def _pack_entry(price):
    metadata = _field(_field(price, 'product'), 'metadata', {})
    pack_id, kind, credits = _field(metadata, 'pack_id'), _field(metadata, 'kind'), _int(_field(metadata, 'credits'))
    if not pack_id or kind not in ('track', 'cloud') or not credits or _field(price, 'type') != 'one_time':
        log.error("Stripe price %s has incomplete package metadata; not offered", price['lookup_key'])
        return None
    return {'id': str(pack_id), 'kind': kind, 'credits': credits, 'price_id': price['id'],
            'lookup_key': price['lookup_key'], 'price': {'amount': price['unit_amount'], 'currency': price['currency']}}


def _fetch():
    keys = list(PLAN_KEYS) + list(PACK_KEYS)
    prices = []
    for start in range(0, len(keys), 10):  # Stripe accepts at most ten lookup keys per request.
        page = stripe.Price.list(lookup_keys=keys[start:start + 10], active=True, expand=['data.product'], limit=100)
        prices.extend(page['data'])
    plans, packs = {}, []
    for price in prices:
        if not _field(_field(price, 'product'), 'active', False):
            continue
        if price['lookup_key'] in PLAN_KEYS and (entry := _plan_entry(price)):
            plans[price['lookup_key']] = entry
        elif price['lookup_key'] in PACK_KEYS and (entry := _pack_entry(price)):
            packs.append(entry)
    packs.sort(key=lambda p: (p['kind'] != 'track', p['credits']))
    return {'plans': plans, 'packs': packs}


def _load():
    """Fetch and cache the catalog. Keeps the last good copy (or nothing) when Stripe fails."""
    global _cache
    try:
        value = _fetch()
        stamp = time.monotonic()
    except stripe.StripeError as error:
        log.error("Stripe catalog could not be loaded: %s", type(error).__name__)
        value = _cache[1] if _cache else {'plans': {}, 'packs': []}
        stamp = time.monotonic() - TTL_SECONDS + RETRY_SECONDS  # Retry in a minute, not on every request.
    _cache = (stamp, value)
    return value


def _refresh_in_background():
    global _refreshing
    try:
        with _lock:
            _load()
    finally:
        _refreshing = False


def resolve(force=False):
    """The catalog, or an empty one when Stripe is not configured or unreachable.

    Only the first load waits for Stripe; later refreshes run in the background and serve the cached copy.
    """
    global _refreshing
    if not stripe.api_key:
        return {'plans': {}, 'packs': []}
    cached = _cache
    if cached and not force:
        if time.monotonic() - cached[0] >= TTL_SECONDS and not _refreshing:
            _refreshing = True
            threading.Thread(target=_refresh_in_background, daemon=True).start()
        return cached[1]
    with _lock:
        if _cache and not force and _cache is not cached:
            return _cache[1]
        return _load()


def clear():
    global _cache
    with _lock:
        _cache = None


def resolved():
    """Billing is live once the catalog has the base plan."""
    return lookup_key('starter', 'month') in resolve()['plans']


def plan(plan_id, interval):
    return resolve()['plans'].get(lookup_key(plan_id, interval))


def by_price(price):
    """Catalog entry for a subscription price (by lookup key, then by price id)."""
    plans = resolve()['plans']
    key = _field(price, 'lookup_key')
    if key in plans:
        return plans[key]
    return next((p for p in plans.values() if p['price_id'] == _field(price, 'id')), None)


def available(plan_id):
    return plan_id not in MIXMIND_PLANS or mixmind_sales_enabled()


def public_plans():
    """Everything the plan picker needs; unavailable MixMind plans are listed as coming soon."""
    items = []
    for plan_id in PLANS:
        for interval in INTERVALS:
            entry = plan(plan_id, interval)
            if entry:
                items.append({key: entry[key] for key in ('plan', 'name', 'interval', 'amount', 'currency', 'tier',
                                                          'included_tracks', 'included_cloud', 'mixmind')}
                             | {'available': available(plan_id)})
    return items


def packs():
    return resolve()['packs']


# Rules on top of each coupon's own product restrictions, which cannot tell a monthly price from a yearly one.
# Any other active code is accepted when its coupon applies to the chosen plan's product.
PROMO_RULES = {
    'FOUNDING100': {'intervals': ('year',), 'message': 'FOUNDING100 works on yearly plans. Switch to yearly to use it.'},
    'CREATOR60': {'plans': ('pro',), 'message': 'CREATOR60 works on the Pro plan.'},
}
PROMO_INVALID = "That code isn't valid or has expired."
PROMO_USED_UP = 'That code has been fully redeemed.'


class PromoError(Exception):
    """A promotion code the user cannot use; the message is shown to them."""


def promotion(code, entry, now=None):
    """The Stripe promotion code ID for `code` on a plan entry, or PromoError explaining why not."""
    code = (code or '').strip()
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,64}', code):
        raise PromoError(PROMO_INVALID)
    found = stripe.PromotionCode.list(code=code, active=True, limit=1)['data']
    if not found:
        raise PromoError(PROMO_INVALID)
    promo = found[0]
    rule = PROMO_RULES.get(str(promo['code']).upper(), {})
    if entry['interval'] not in rule.get('intervals', INTERVALS) or entry['plan'] not in rule.get('plans', PLANS):
        raise PromoError(rule['message'])
    if _field(promo, 'expires_at') and promo['expires_at'] <= (now or time.time()):
        raise PromoError(PROMO_INVALID)
    if _field(promo, 'max_redemptions') and _field(promo, 'times_redeemed', 0) >= promo['max_redemptions']:
        raise PromoError(PROMO_USED_UP)
    # API versions from 2025-09-30 name the coupon under promotion.coupon; older ones expand promo.coupon.
    coupon_id = _field(_field(promo, 'promotion', {}), 'coupon') or _field(promo, 'coupon')
    coupon_id = coupon_id if isinstance(coupon_id, str) else _field(coupon_id, 'id')
    coupon = stripe.Coupon.retrieve(coupon_id, expand=['applies_to'])
    if not _field(coupon, 'valid', False):
        raise PromoError(PROMO_USED_UP)
    products = _field(_field(coupon, 'applies_to', {}), 'products', [])
    if products and entry['product_id'] not in products:
        raise PromoError(f"That code doesn't apply to the {entry['name']} plan.")
    return promo['id']
