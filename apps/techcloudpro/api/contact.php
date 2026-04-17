<?php
/**
 * TechCloudPro Contact Form Handler
 * Sends via Office365 SMTP (peter@techcloudpro.com)
 * To: contact@techcloudpro.com | Cc: rajesh@, jm@
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit; }

// Rate limiting
$ip = $_SERVER['REMOTE_ADDR'];
$rateFile = sys_get_temp_dir() . '/tcp_rate_' . md5($ip) . '.json';
$now = time();
if (file_exists($rateFile)) {
    $rateData = json_decode(file_get_contents($rateFile), true);
    $rateData = array_filter($rateData, function($t) use ($now) { return ($now - $t) < 3600; });
    if (count($rateData) >= 5) { http_response_code(429); echo json_encode(['error' => 'Too many requests.']); exit; }
    $rateData[] = $now;
} else { $rateData = [$now]; }
file_put_contents($rateFile, json_encode($rateData));

// Parse & validate
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) { http_response_code(400); echo json_encode(['error' => 'Invalid request']); exit; }
if (!empty($input['_honey'])) { echo json_encode(['success' => true]); exit; }

$name = htmlspecialchars(trim($input['name'] ?? ''), ENT_QUOTES, 'UTF-8');
$email = htmlspecialchars(trim($input['email'] ?? ''), ENT_QUOTES, 'UTF-8');
$company = htmlspecialchars(trim($input['company'] ?? ''), ENT_QUOTES, 'UTF-8');
$phone = htmlspecialchars(trim($input['phone'] ?? ''), ENT_QUOTES, 'UTF-8');
$service = htmlspecialchars(trim($input['service'] ?? ''), ENT_QUOTES, 'UTF-8');
$message = htmlspecialchars(trim($input['message'] ?? ''), ENT_QUOTES, 'UTF-8');
$source = htmlspecialchars(trim($input['_source'] ?? 'contact-page'), ENT_QUOTES, 'UTF-8');

if (empty($name) || empty($email)) { http_response_code(400); echo json_encode(['error' => 'Name and email required']); exit; }
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { http_response_code(400); echo json_encode(['error' => 'Invalid email']); exit; }

// Build subject & body
$subject = "New Lead from TechCloudPro: $name" . ($company ? " ($company)" : "");

$body = "<html><head><style>
body{font-family:-apple-system,Arial,sans-serif;color:#333;line-height:1.6}
.c{max-width:600px;margin:0 auto;padding:24px}
h2{color:#2563EB;border-bottom:2px solid #2563EB;padding-bottom:8px}
.f{margin-bottom:16px}.l{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#64748B;margin-bottom:4px}
.v{font-size:15px;color:#0F172A}.ft{margin-top:24px;padding-top:16px;border-top:1px solid #E2E8F0;font-size:12px;color:#94A3B8}
</style></head><body><div class='c'><h2>New Contact Form Submission</h2>";
$body .= "<div class='f'><div class='l'>Name</div><div class='v'>$name</div></div>";
$body .= "<div class='f'><div class='l'>Email</div><div class='v'><a href='mailto:$email'>$email</a></div></div>";
if ($company) $body .= "<div class='f'><div class='l'>Company</div><div class='v'>$company</div></div>";
if ($phone) $body .= "<div class='f'><div class='l'>Phone</div><div class='v'>$phone</div></div>";
if ($service) $body .= "<div class='f'><div class='l'>Service</div><div class='v'>$service</div></div>";
if ($message) $body .= "<div class='f'><div class='l'>Message</div><div class='v'>" . nl2br($message) . "</div></div>";
$body .= "<div class='ft'>Source: $source | IP: {$_SERVER['REMOTE_ADDR']} | " . date('Y-m-d H:i:s T') . "</div>";
$body .= "</div></body></html>";

// ---- Email via Hostinger native mail() ----
$fromAddr = 'noreply@techcloudpro.com';
$recipients = 'contact@techcloudpro.com, rajesh@techcloudpro.com, jm@techcloudpro.com';

$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "From: TechCloudPro Contact <{$fromAddr}>\r\n";
$headers .= "Reply-To: {$name} <{$email}>\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

$success = @mail($recipients, $subject, $body, $headers);
$smtpError = $success ? '' : 'mail() returned false';

// Save lead to local JSON file (never lose a lead)
$leadsDir = __DIR__ . '/../leads';
if (!is_dir($leadsDir)) { mkdir($leadsDir, 0755, true); }
$leadRecord = [
    'id' => uniqid('lead_'),
    'name' => $name,
    'email' => $email,
    'company' => $company,
    'phone' => $phone,
    'service' => $service,
    'message' => $message,
    'source' => $source,
    'ip' => $_SERVER['REMOTE_ADDR'],
    'timestamp' => date('c'),
    'email_sent' => $success,
];
file_put_contents(
    $leadsDir . '/leads.jsonl',
    json_encode($leadRecord) . "\n",
    FILE_APPEND | LOCK_EX
);

// Also save to BrandMonkz CRM (non-blocking — don't fail the form if this fails)
$crmUrl = 'https://brandmonkz.com/api/leads/public';
$crmPayload = json_encode([
    'firstName' => explode(' ', $name)[0],
    'lastName' => implode(' ', array_slice(explode(' ', $name), 1)) ?: '-',
    'email' => $email,
    'phone' => $phone,
    'company' => $company,
    'notes' => "Source: $source | Service: $service | Message: $message",
    'source' => 'techcloudpro_form',
    'status' => 'LEAD',
]);
$ch = curl_init($crmUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, $crmPayload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$crmResp = curl_exec($ch);
$crmCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Lead is always captured (disk + CRM); email is best-effort notification
if (!$success) {
    error_log("TechCloudPro contact mail() failed: $smtpError | lead saved locally");
}
echo json_encode(['success' => true, 'lead_saved' => true, 'email_sent' => $success, 'crm_status' => $crmCode]);
