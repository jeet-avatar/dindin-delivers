import boto3, json, os, smtplib, urllib.request
from datetime import datetime, timezone, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

PT         = timezone(timedelta(hours=-7))
RESEND_KEY = os.environ["RESEND_KEY"]
ALERT_TO   = os.environ.get("ALERT_TO", "jeetnair.in@gmail.com")
ALERT_FROM = "Jitesh Manoharan <hello@artha.build>"
JITESH_IP  = "184.189.123.74"

GROUPS = {
    "/aws/lambda/marquee-app":    "marquee.zietra.com",
    "/aws/lambda/asc606-app":     "asc606.zietra.com",
    "/aws/lambda/zietra-tracker": "turionspace.zietra.com",
}

def geo(ip, cache={}):
    if ip in cache:
        return cache[ip]
    try:
        with urllib.request.urlopen(f"https://ipinfo.io/{ip}/json", timeout=3) as r:
            d = json.loads(r.read())
            result = f"{d.get('city','?')}, {d.get('region','?')} {d.get('country','')} — {d.get('org','')}"
    except:
        result = "Unknown"
    cache[ip] = result
    return result

def handler(event, context):
    logs  = boto3.client("logs", region_name="us-east-1")
    now   = datetime.now(timezone.utc)
    start = int((now - timedelta(hours=1)).timestamp() * 1000)

    ips = {}
    for log_group, site in GROUPS.items():
        kwargs = dict(logGroupName=log_group, startTime=start, filterPattern='"[visitor]"')
        try:
            while True:
                resp = logs.filter_log_events(**kwargs)
                for e in resp.get("events", []):
                    msg = e.get("message", "")
                    if "[visitor]" not in msg:
                        continue
                    try:
                        raw = msg.strip()
                        d   = json.loads(raw) if raw.startswith("{") else json.loads(msg.split("[visitor]")[1].strip())
                        ip   = d.get("ip", "")
                        path = d.get("path", "")
                        at   = datetime.fromisoformat(d["at"].replace("Z", "+00:00")).astimezone(PT)
                        if ip == JITESH_IP:
                            continue
                        if ip not in ips:
                            ips[ip] = {"first": at, "last": at, "pages": []}
                        ips[ip]["last"] = max(ips[ip]["last"], at)
                        ips[ip]["pages"].append({"t": at.strftime("%I:%M %p PT"), "page": site + path})
                    except:
                        pass
                token = resp.get("nextToken")
                if not token:
                    break
                kwargs["nextToken"] = token
        except Exception as e:
            print(f"[warn] Could not read {log_group}: {e}")
            # Continue to next group — do NOT re-raise

    hour_label = now.astimezone(PT).strftime("%I %p PT")

    if not ips:
        body_content = "<p style='color:#475569;font-size:14px'>No external visitors in the last hour.</p>"
    else:
        body_content = ""
        for ip, v in sorted(ips.items(), key=lambda x: x[1]["first"]):
            location = geo(ip)
            rows = "".join(
                f"<tr><td style='padding:5px 10px;font-size:12px;color:#64748b'>{p['t']}</td>"
                f"<td style='padding:5px 10px;font-size:12px;font-family:monospace'>"
                f"<a href='https://{p['page']}?utm_source=hourly-report&utm_medium=email&utm_campaign=zietra-demo' "
                f"style='color:#3b82f6;text-decoration:none'>{p['page']}</a></td></tr>"
                for p in v["pages"]
            )
            body_content += f"""
<div style='margin-bottom:20px;background:#f8fafc;border-left:3px solid #3b82f6;border-radius:6px;padding:14px 18px'>
  <div style='font-size:13px;font-weight:600;color:#0f172a'>{ip}</div>
  <div style='font-size:12px;color:#64748b;margin:2px 0 10px'>{location}</div>
  <table style='width:100%;border-collapse:collapse'>{rows}</table>
</div>"""

    html = f"""<!DOCTYPE html><html><body style='font-family:-apple-system,Arial,sans-serif;background:#f8f8f8;margin:0;padding:0'>
<div style='max-width:660px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)'>
  <div style='background:#0f172a;padding:20px 32px'>
    <h2 style='color:#fff;margin:0;font-size:17px'>Zietra Demo — Hourly Visitor Report</h2>
    <p style='color:#94a3b8;margin:4px 0 0;font-size:12px'>Last hour ending {hour_label} &nbsp;|&nbsp; External visitors only</p>
  </div>
  <div style='padding:24px 32px'>{body_content}</div>
  <div style='background:#f1f5f9;padding:14px 32px;font-size:11px;color:#94a3b8'>
    <a href='https://marquee.zietra.com?utm_source=hourly-report&utm_medium=email&utm_campaign=zietra-demo' style='color:#94a3b8'>marquee.zietra.com</a> &nbsp;·&nbsp; <a href='https://asc606.zietra.com?utm_source=hourly-report&utm_medium=email&utm_campaign=zietra-demo' style='color:#94a3b8'>asc606.zietra.com</a> &nbsp;·&nbsp; <a href='https://turionspace.zietra.com?utm_source=hourly-report&utm_medium=email&utm_campaign=zietra-demo' style='color:#94a3b8'>turionspace.zietra.com</a> &nbsp;·&nbsp; auto-report every hour
  </div>
</div></body></html>"""

    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"Zietra demo — hourly report ({hour_label}) · {len(ips)} visitor(s)"
    msg['From']    = ALERT_FROM
    msg['To']      = ALERT_TO
    msg.attach(MIMEText(html, 'html'))

    with smtplib.SMTP('smtp.resend.com', 587) as s:
        s.ehlo(); s.starttls()
        s.login('resend', RESEND_KEY)
        s.sendmail('hello@artha.build', [ALERT_TO], msg.as_string())

    print(f"Hourly report sent — {len(ips)} external visitor(s)")
    return {"visitors": len(ips)}
