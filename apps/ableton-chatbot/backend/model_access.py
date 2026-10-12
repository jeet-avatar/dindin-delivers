"""Per-plan AI model access and Bedrock model-id resolution.

Starter plans use Fast (Haiku 4.5) only.  Pro plans add Pro (Sonnet).
Studio plans add Ultra (Opus 5.5) on top.  The user picks a model tier
per song; the backend resolves it to a Bedrock model ID and validates
that the user's subscription tier allows it.
"""

import os

from fastapi import HTTPException

TIERS = {
    'fast': {
        'label': 'Fast mode',
        'bedrock': 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
        'anthropic': 'claude-haiku-4-5-20251001',
        'plans': {'starter', 'pro', 'studio'},
    },
    'pro': {
        'label': 'Pro mode',
        'bedrock': 'us.anthropic.claude-sonnet-4-6-20250514-v1:0',
        'anthropic': 'claude-sonnet-4-6-20250514',
        'plans': {'pro', 'studio'},
    },
    'ultra': {
        'label': 'Ultra mode',
        'bedrock': 'us.anthropic.claude-opus-4-20250514-v1:0',
        'anthropic': 'claude-opus-4-20250514',
        'plans': {'studio'},
    },
}

DEFAULT_TIER = 'fast'
ALL_TIER_KEYS = list(TIERS.keys())

PLAN_DEFAULTS = {'starter': 'fast', 'pro': 'fast', 'studio': 'fast', 'trial': 'fast'}


def available_models(plan_tier):
    """Model tier keys this plan can use, ordered fast → pro → ultra."""
    plan_tier = 'starter' if not plan_tier or plan_tier == 'trial' else plan_tier
    return [key for key, spec in TIERS.items() if plan_tier in spec['plans']]


def resolve(model_tier, plan_tier, provider=None):
    """Bedrock or Anthropic model ID for a chosen tier, validated against the plan.

    Returns (model_id, tier_key, label).  Raises 403 if the plan doesn't include that model.
    """
    model_tier = model_tier or PLAN_DEFAULTS.get(plan_tier, DEFAULT_TIER)
    if model_tier not in TIERS:
        model_tier = DEFAULT_TIER

    spec = TIERS[model_tier]
    plan_tier = 'starter' if not plan_tier or plan_tier == 'trial' else plan_tier
    if plan_tier not in spec['plans']:
        allowed = ', '.join(TIERS[k]['label'] for k in available_models(plan_tier))
        raise HTTPException(403, f"{spec['label']} requires a plan upgrade. Your plan includes: {allowed}.")

    if provider is None:
        provider = os.getenv('BEATMIND_AI_PROVIDER', 'anthropic').lower()
    model_id = spec['bedrock'] if provider == 'bedrock' else spec['anthropic']
    return model_id, model_tier, spec['label']


def label(model_tier):
    """Human label for a model tier key."""
    return TIERS.get(model_tier, TIERS[DEFAULT_TIER])['label']
