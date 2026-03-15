<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once("../config/database.php");

$method = $_SERVER["REQUEST_METHOD"];

// Handle CORS preflight
if ($method === "OPTIONS") {
    http_response_code(200);
    exit;
}

// ======================================================
// GET POSITIONS
// ======================================================
if ($method === "GET") {
    try {
        $q1 = "SELECT position_ID, position_name FROM position ORDER BY position_name";
        $stmt = $conn->prepare($q1);
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (Exception $e1) {
        try {
            $q2 = "SELECT position_ID, position AS position_name FROM position ORDER BY position";
            $stmt = $conn->prepare($q2);
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (Exception $e2) {
            try {
                $q3 = "SELECT position_ID, position_name FROM positions ORDER BY position_name";
                $stmt = $conn->prepare($q3);
                $stmt->execute();
                echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            } catch (Exception $e3) {
                try {
                    $q4 = "SELECT position_ID, position AS position_name FROM positions ORDER BY position";
                    $stmt = $conn->prepare($q4);
                    $stmt->execute();
                    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
                } catch (Exception $e4) {
                    echo json_encode([
                        "error" => true,
                        "message" => $e4->getMessage()
                    ]);
                }
            }
        }
    }
    exit;
}

// ======================================================
// ADD POSITION
// ======================================================
if ($method === "POST") {
    $data = json_decode(file_get_contents("php://input"), true);
    $position_name = trim($data["position_name"] ?? "");

    if ($position_name === "") {
        echo json_encode([
            "error" => true,
            "message" => "Position name is required"
        ]);
        exit;
    }

    try {
        // Primary schema: position table with position_name
        $insert = $conn->prepare("INSERT INTO position (position_name) VALUES (?)");
        $insert->execute([$position_name]);

        echo json_encode([
            "success" => true,
            "message" => "Position added successfully"
        ]);
    } catch (Exception $e1) {
        try {
            // Fallback 1: position table with position column
            $insert2 = $conn->prepare("INSERT INTO position (position) VALUES (?)");
            $insert2->execute([$position_name]);

            echo json_encode([
                "success" => true,
                "message" => "Position added successfully"
            ]);
        } catch (Exception $e2) {
            try {
                // Fallback 2: positions table with position_name
                $insert3 = $conn->prepare("INSERT INTO positions (position_name) VALUES (?)");
                $insert3->execute([$position_name]);

                echo json_encode([
                    "success" => true,
                    "message" => "Position added successfully"
                ]);
            } catch (Exception $e3) {
                try {
                    // Fallback 3: positions table with position column
                    $insert4 = $conn->prepare("INSERT INTO positions (position) VALUES (?)");
                    $insert4->execute([$position_name]);

                    echo json_encode([
                        "success" => true,
                        "message" => "Position added successfully"
                    ]);
                } catch (Exception $e4) {
                    echo json_encode([
                        "error" => true,
                        "message" => $e4->getMessage()
                    ]);
                }
            }
        }
    }
    exit;
}

// ======================================================
// UPDATE POSITION
// ======================================================
if ($method === "PUT") {
    $id = $_GET["id"] ?? null;
    $data = json_decode(file_get_contents("php://input"), true);
    $position_name = trim($data["position_name"] ?? "");

    if (!$id || $position_name === "") {
        echo json_encode([
            "error" => true,
            "message" => "Position ID and name are required"
        ]);
        exit;
    }

    try {
        $update = $conn->prepare("UPDATE position SET position_name = ? WHERE position_ID = ?");
        $update->execute([$position_name, $id]);

        echo json_encode([
            "success" => true,
            "message" => "Position updated successfully"
        ]);
    } catch (Exception $e1) {
        try {
            $update2 = $conn->prepare("UPDATE position SET position = ? WHERE position_ID = ?");
            $update2->execute([$position_name, $id]);

            echo json_encode([
                "success" => true,
                "message" => "Position updated successfully"
            ]);
        } catch (Exception $e2) {
            try {
                $update3 = $conn->prepare("UPDATE positions SET position_name = ? WHERE position_ID = ?");
                $update3->execute([$position_name, $id]);

                echo json_encode([
                    "success" => true,
                    "message" => "Position updated successfully"
                ]);
            } catch (Exception $e3) {
                try {
                    $update4 = $conn->prepare("UPDATE positions SET position = ? WHERE position_ID = ?");
                    $update4->execute([$position_name, $id]);

                    echo json_encode([
                        "success" => true,
                        "message" => "Position updated successfully"
                    ]);
                } catch (Exception $e4) {
                    echo json_encode([
                        "error" => true,
                        "message" => $e4->getMessage()
                    ]);
                }
            }
        }
    }
    exit;
}

// ======================================================
// DELETE POSITION
// ======================================================
if ($method === "DELETE") {
    $id = $_GET["id"] ?? null;

    if (!$id) {
        echo json_encode([
            "error" => true,
            "message" => "Position ID is required"
        ]);
        exit;
    }

    try {
        $del = $conn->prepare("DELETE FROM position WHERE position_ID = ?");
        $del->execute([$id]);

        echo json_encode([
            "success" => true,
            "message" => "Position removed successfully"
        ]);
    } catch (Exception $e1) {
        try {
            $del2 = $conn->prepare("DELETE FROM positions WHERE position_ID = ?");
            $del2->execute([$id]);

            echo json_encode([
                "success" => true,
                "message" => "Position removed successfully"
            ]);
        } catch (Exception $e2) {
            echo json_encode([
                "error" => true,
                "message" => $e2->getMessage()
            ]);
        }
    }
    exit;
}

echo json_encode([
    "error" => true,
    "message" => "Invalid request method"
]);
