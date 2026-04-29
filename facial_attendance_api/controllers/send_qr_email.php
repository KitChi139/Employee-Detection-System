<?php
// Enable error logging but hide from output to avoid breaking JSON
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    require_once("../config/database.php");

    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Invalid JSON input: " . json_last_error_msg());
    }

    $email = trim($data["email"] ?? "");
    $qr_code_base64 = $data["qr_code"] ?? "";
    $employee_name = $data["employee_name"] ?? "Employee";

    if ($email === "" || $qr_code_base64 === "") {
        echo json_encode(["error" => true, "message" => "Email and QR Code are required"]);
        exit;
    }

    $email_config = __DIR__ . "/../config/email_config.php";
    if (!file_exists($email_config)) {
        throw new Exception("Email configuration file missing at: $email_config");
    }
    require_once($email_config);

    // Find PHPMailer path
    $primary = __DIR__ . "/../vendor/PHPMailer/src";
    $alt = __DIR__ . "/../vendor/PHPMailer-master/src";
    $vendorPath = is_dir($primary) ? $primary : (is_dir($alt) ? $alt : null);
    
    if (!$vendorPath) {
        throw new Exception("PHPMailer source not found in vendor directory.");
    }
    
    require_once $vendorPath . "/PHPMailer.php";
    require_once $vendorPath . "/SMTP.php";
    require_once $vendorPath . "/Exception.php";

    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    
    // Server settings
    $mail->isSMTP();
    $mail->Host       = SMTP_HOST;
    $mail->SMTPAuth   = true;
    $mail->Username   = SMTP_USERNAME;
    $mail->Password   = SMTP_PASSWORD;
    $mail->SMTPSecure = SMTP_SECURE;
    $mail->Port       = SMTP_PORT;
    $mail->Timeout    = 30; // 30 seconds timeout for SMTP

    // Recipients
    $mail->setFrom(SMTP_FROM, SMTP_FROM_NAME);
    $mail->addAddress($email, $employee_name);

    // Attach QR Code from base64
    if (preg_match('/^data:image\/(\w+);base64,/', $qr_code_base64, $type)) {
        $qr_code_base64 = substr($qr_code_base64, strpos($qr_code_base64, ',') + 1);
        $type = strtolower($type[1]);

        if (!in_array($type, ['jpg', 'jpeg', 'gif', 'png'])) {
            throw new Exception("Invalid image type: $type");
        }
        $qr_code_binary = base64_decode($qr_code_base64);

        if ($qr_code_binary === false) {
            throw new Exception("Failed to decode base64 image data.");
        }
    } else {
        throw new Exception("Invalid QR code data format.");
    }

    // Embed image in body
    $mail->addStringEmbeddedImage($qr_code_binary, 'qr_code_cid', 'qrcode.png', 'base64', 'image/png');

    // Content
    $mail->isHTML(true);
    $mail->Subject = "Your Employee QR Code";
    $mail->Body    = "
        <div style='font-family: Arial, sans-serif; padding: 20px; color: #333;'>
            <h2>Hello, {$employee_name}!</h2>
            <p>Attached is your unique Employee QR Code for the Attendance System.</p>
            <p>Please keep this QR code handy as you will need it for scanning in/out.</p>
            <div style='margin-top: 20px; text-align: center;'>
                <img src='cid:qr_code_cid' alt='QR Code' style='width: 200px; height: 200px; border: 1px solid #ddd; padding: 10px; border-radius: 8px;'>
            </div>
            <p style='margin-top: 30px; font-size: 0.9em; color: #777;'>
                If you didn't expect this email, please ignore it.
            </p>
        </div>
    ";
    $mail->AltBody = "Hello $employee_name, your QR code is attached to this email. Please use it for the Attendance System.";

    if($mail->send()) {
        echo json_encode(["success" => true, "message" => "Email sent successfully"]);
    } else {
        throw new Exception("Mail failed to send without throwing an error.");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "error" => true, 
        "message" => $e->getMessage(),
        "detail" => isset($mail) ? $mail->ErrorInfo : null
    ]);
}
