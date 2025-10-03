<?php

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(404);
    exit;
}
if (!isset($_SERVER['HTTP_X_PASSWORD'])) {
    http_response_code(400);
    exit;
}
// if (strpos($_SERVER['CONTENT_TYPE'], 'application/octet-stream') === false) {
//     http_response_code(401);
//     exit;
// }

function generate_chacha_key_from_password(string $pass)
{
    $salt = random_bytes(SODIUM_CRYPTO_PWHASH_SALTBYTES);
    $key = sodium_crypto_pwhash(
        32,
        $pass,
        $salt,
        SODIUM_CRYPTO_PWHASH_OPSLIMIT_MODERATE,
        SODIUM_CRYPTO_PWHASH_MEMLIMIT_MODERATE
    );
    return [
        'key' => $key,
        'salt' => $salt
    ];
}

$password = $_SERVER['HTTP_X_PASSWORD'];
$key_data = generate_chacha_key_from_password($password);
$chacha_key = $key_data['key'];
$file_salt = $key_data['salt'];

$chunk_size = 64 * 1024; 

list($stream_handle, $sodium_header) = sodium_crypto_secretstream_xchacha20poly1305_init_push($chacha_key);

$source_handle = fopen('php://input', 'rb');
if ($source_handle === false) {
    http_response_code(500);
    exit("php error php://input");
}

$output_handle = fopen('php://output', 'wb');

header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="encrypted_stream_output.dat"');
header('Cache-Control: no-cache, no-store, must-revalidate');
http_response_code(200);

fwrite($output_handle, $file_salt);
fwrite($output_handle, $sodium_header);

$final_chunk = false;

//----------
while (!feof($source_handle)) {
    $chunk = fread($source_handle, $chunk_size);
    
    if ($chunk === false) {
        break;
    }
    
    if (feof($source_handle) || strlen($chunk) < $chunk_size) {
        $final_chunk = true;
        $flag = SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_TAG_FINAL;
    } else {
        $flag = SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_TAG_MESSAGE;
    }

    $ciphertext_chunk = sodium_crypto_secretstream_xchacha20poly1305_push(
        $stream_handle,
        $chunk, 
        '',
        $flag
    );
    
    fwrite($output_handle, $ciphertext_chunk);
    flush();
    
    if ($final_chunk) break;
}
//-----------

fclose($source_handle);
fclose($output_handle);
