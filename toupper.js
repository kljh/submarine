process.stdin.once('data', function (txt) {
	process.stdin.pause();
	console.log ((''+txt).toUpperCase());
});