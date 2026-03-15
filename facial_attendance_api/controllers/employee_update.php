<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once("../config/database.php");

/* ----------------------------------
   Handle CORS preflight
---------------------------------- */

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/* ----------------------------------
   Allow POST only
---------------------------------- */

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        "error" => true,
        "message" => "Invalid request method"
    ]);
    exit;
}

/* ----------------------------------
   Get JSON data
---------------------------------- */

$data = json_decode(file_get_contents("php://input"), true);

$employee_id   = $data["employee_ID"] ?? null;
$employee_code = $data["employee_code"] ?? null;
$firstName     = $data["employee_firstName"] ?? null;
$lastName      = $data["employee_LastName"] ?? null;
$email_ID      = $data["email_ID"] ?? null;
$department_ID = $data["department_ID"] ?? null;
$position_ID   = $data["position_ID"] ?? null;

/* ----------------------------------
   Validation
---------------------------------- */

if (!$employee_id || !$employee_code || !$firstName || !$lastName) {

    echo json_encode([
        "error" => true,
        "message" => "Required fields missing"
    ]);

    exit;
}

try {

    /* ----------------------------------
       Prevent duplicate employee_code
    ---------------------------------- */

    $check = $conn->prepare("
        SELECT employee_ID
        FROM employees
        WHERE employee_code = ?
        AND employee_ID <> ?
    ");

    $check->execute([$employee_code, $employee_id]);

    if ($check->fetch()) {

        echo json_encode([
            "error" => true,
            "message" => "Employee code already exists"
        ]);

        exit;
    }

    /* ----------------------------------
       Update employee
    ---------------------------------- */

    $query = "
        UPDATE employees
        SET
            employee_code = ?,
            employee_firstName = ?,
            employee_lastName = ?,
            email_ID = ?,
            department_ID = ?,
            position_ID = ?
        WHERE employee_ID = ?
    ";

    $stmt = $conn->prepare($query);

    $stmt->execute([
        $employee_code,
        $firstName,
        $lastName,
        $email_ID ?: null,
        $department_ID ?: null,
        $position_ID ?: null,
        $employee_id
    ]);

    echo json_encode([
        "success" => true,
        "message" => "Employee updated successfully"
    ]);

} catch (Exception $e) {

    echo json_encode([
        "error" => true,
        "message" => $e->getMessage()
    ]);

}