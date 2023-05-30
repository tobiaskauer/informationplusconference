<?

$directory = 'images/gallery/';
$names = scandir($directory);
$names = json_encode($names);
echo ($names);

?>