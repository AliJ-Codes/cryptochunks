<?php

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(404);
    exit;
}

if (!isset($_SERVER['HTTP_X_PASSWORD'])) {
    http_response_code(400);
    exit;
}

function regenerate_chacha_key_from_password(string $pass, string $salt)
{
    $key = sodium_crypto_pwhash(
        32,
        $pass,
        $salt,
        SODIUM_CRYPTO_PWHASH_OPSLIMIT_MODERATE,
        SODIUM_CRYPTO_PWHASH_MEMLIMIT_MODERATE
    );
    return $key;
}

$password = $_SERVER['HTTP_X_PASSWORD'];
$chunk_size = 64 * 1024; 
$encrypted_chunk_size = $chunk_size + SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_ABYTES;

$source_handle = fopen('php://input', 'rb');
if ($source_handle === false) {
    http_response_code(500);
    exit("Error opening input stream");
}
$file_salt = fread($source_handle, SODIUM_CRYPTO_PWHASH_SALTBYTES);
if (strlen($file_salt) !== SODIUM_CRYPTO_PWHASH_SALTBYTES) {
    http_response_code(400);
    fclose($source_handle);
    exit("Invalid encrypted file - salt missing");
}
$sodium_header = fread($source_handle, SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_HEADERBYTES);
if (strlen($sodium_header) !== SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_HEADERBYTES) {
    http_response_code(400);
    fclose($source_handle);
    exit("Invalid encrypted file - header missing");
}
$chacha_key = regenerate_chacha_key_from_password($password, $file_salt);
$stream_handle = sodium_crypto_secretstream_xchacha20poly1305_init_pull($sodium_header, $chacha_key);
if ($stream_handle === false) {
    http_response_code(401);
    fclose($source_handle);
    exit("Invalid password or corrupted file");
}

$output_handle = fopen('php://output', 'wb');

header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="decrypted_output.dat"');
header('Cache-Control: no-cache, no-store, must-revalidate');
http_response_code(200);


$buffer = '';
$eof_reached = false;

while (!$eof_reached) {
    $chunk = fread($source_handle, $encrypted_chunk_size - strlen($buffer));
    
    if ($chunk === false) {
        break;
    }
    
    $buffer .= $chunk;
    
    if (feof($source_handle)) {
        $eof_reached = true;
    }
    
    if (strlen($buffer) >= $encrypted_chunk_size || $eof_reached) {
        if (strlen($buffer) === 0) {
            break;
        }
        
        list($decrypted_chunk, $tag) = sodium_crypto_secretstream_xchacha20poly1305_pull(
            $stream_handle,
            $buffer
        );
        
        if ($decrypted_chunk === false) {
            http_response_code(500);
            fclose($source_handle);
            fclose($output_handle);
            exit("Decryption failed - invalid password or corrupted data");
        }
                
        fwrite($output_handle, $decrypted_chunk);
        flush();
        
         if ($tag === SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_TAG_FINAL) {
            break;
        }
        
        $buffer = '';
    }
}
//-----
fclose($source_handle);
fclose($output_handle);
