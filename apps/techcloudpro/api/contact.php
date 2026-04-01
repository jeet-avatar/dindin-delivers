<?php
/**
 * TechCloudPro Contact Form Handler
 * Receives POST JSON, validates, sends email to jm@ + rajesh@
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Only POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Rate limiting (file-based, 5 per hour per IP)
$ip = $_SERVER['REMOTE_ADDR'];
$rateFile = sys_get_temp_dir() . '/tcp_rate_' . md5($ip) . '.json';
$now = time();
$window = 3600; // 1 hour
$maxRequests = 5;

if (file_exists($rateFile)) {
    $rateData = json_decode(file_get_contents($rateFile), true);
    // Clean old entries
    $rateData = array_filter($rateData, function($t) use ($now, $window) {
        return ($now - $t) < $window;
    });
    if (count($rateData) >= $maxRequests) {
        http_response_code(429);
        echo json_encode(['error' => 'Too many requests. Please try again later.']);
        exit;
    }
    $rateData[] = $now;
} else {
    $rateData = [$now];
}
file_put_contents($rateFile, json_encode($rateData));

// Parse input
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request body']);
    exit;
}

// Honeypot check
if (!empty($input['_honey'])) {
    // Bot detected, pretend success
    echo json_encode(['success' => true]);
    exit;
}

// Validate required fields
$name = trim($input['name'] ?? '');
$email = trim($input['email'] ?? '');
$company = trim($input['company'] ?? '');
$phone = trim($input['phone'] ?? '');
$service = trim($input['service'] ?? '');
$message = trim($input['message'] ?? '');

if (empty($name) || empty($email)) {
    http_response_code(400);
    echo json_encode(['error' => 'Name and email are required']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email address']);
    exit;
}

// Sanitize
$name = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
$email = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
$company = htmlspecialchars($company, ENT_QUOTES, 'UTF-8');
$phone = htmlspecialchars($phone, ENT_QUOTES, 'UTF-8');
$service = htmlspecialchars($service, ENT_QUOTES, 'UTF-8');
$message = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');

// Build email
$subject = "New Lead from TechCloudPro: $name" . ($company ? " ($company)" : "");

$body = "
<html>
<head><style>
body { font-family: -apple-system, Arial, sans-serif; color: #333; line-height: 1.6; }
.container { max-width: 600px; margin: 0 auto; padding: 24px; }
h2 { color: #2563EB; border-bottom: 2px solid #2563EB; padding-bottom: 8px; }
.field { margin-bottom: 16px; }
.label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748B; margin-bottom: 4px; }
.value { font-size: 15px; color: #0F172A; }
.footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #94A3B8; }
</style></head>
<body>
<div class='container'>
<h2>New Contact Form Submission</h2>

<div class='field'>
<div class='label'>Name</div>
<div class='value'>$name</div>
</div>

<div class='field'>
<div class='label'>Email</div>
<div class='value'><a href='mailto:$email'>$email</a></div>
</div>
" .
($company ? "<div class='field'><div class='label'>Company</div><div class='value'>$company</div></div>" : "") .
($phone ? "<div class='field'><div class='label'>Phone</div><div class='value'>$phone</div></div>" : "") .
($service ? "<div class='field'><div class='label'>Service of Interest</div><div class='value'>$service</div></div>" : "") .
($message ? "<div class='field'><div class='label'>Message</div><div class='value'>" . nl2br($message) . "</div></div>" : "") .
"
<div class='footer'>
Sent from techcloudpro.com contact form<br>
IP: {$_SERVER['REMOTE_ADDR']}<br>
Time: " . date('Y-m-d H:i:s T') . "
</div>
</div>
</body>
</html>";

// Email headers
$headers = "MIME-Version: 1.0\r\n";
$headers .= "Content-type: text/html; charset=UTF-8\r\n";
$headers .= "From: TechCloudPro <noreply@techcloudpro.com>\r\n";
$headers .= "Reply-To: $name <$email>\r\n";

// Send to both recipients
$recipients = ['jm@techcloudpro.com', 'rajesh@techcloudpro.com'];
$allSent = true;

foreach ($recipients as $to) {
    if (!mail($to, $subject, $body, $headers)) {
        $allSent = false;
    }
}

if ($allSent) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send email. Please try again.']);
}
