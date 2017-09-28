$(function () {

$('.upload-btn').on('click', function () {
	$('#upload-input').click();
});

$('#upload-input').on('change', function (){
	$('.file-progress').remove();
	$('.progress-bar').text('');
	$('.progress-bar').width('0%');
	
	var files = $(this).get(0).files;
	
	//info_msg("#files: "+files.length);
	
	var total_size = 0 ;
	for (var i=0; i<files.length; i++) {
		var file = files[i];
		total_size += file.size;
		//info_msg(file.name+" "+file.webkitRelative+" "+file.size+" "+file.type+" "+new Date(file.lastModified).toISOString() ); //lastModifiedDate
	}
	info_msg("total_size: "+total_size);
	
	var nb_files = files.length;
	var nb_queued = 0;
	var nb_done = 0;
	
	var total_up = 0 ;
	for (var i=0; i<Math.min(nb_files, 4); i++) {
		var file = files[i];
		upload_file(i, file)
	}

	function upload_file(i, file) {
		nb_queued++;
		
		$('.panel-body').append('<div class="progress  file-progress"><div class="progress-bar" role="progressbar" id="file-'+i+'-progress-bar"></div></div>');
		$('#file-'+i+'-progress-bar').text(file.name+"...");
		
		file.tqueue = new Date();
		file.bytes_up = 0;

		xhr_put_file(file, function() { 
			nb_done++;
			//$('#file-'+i+'-progress-bar').text(file.name+" DONE");
			$('#total-progress-bar').text(nb_done + ' / ' + nb_files + ' file(s)');
			if (nb_queued<nb_files)
				upload_file(nb_queued, files[nb_queued]);
		}, function(e) { 
			$('#file-'+i+'-progress-bar').text(file.name+" ERROR");
			$('#file-'+i+'-progress-bar').width("100%");
			$('#file-'+i+'-progress-bar').css({
				'background-image': 'none',
				'background-color': 'orange'
			});
		}, function(e) {
			// e.loaded / e.total
			upload_file_update(i, file, e.loaded);
		})
	}

	function upload_file_update(i, file, bytes_up) {
		var now = new Date();
		
		var delta_t = now - (file.tprev || file.tqueue);
		var delta_bytes = bytes_up - file.bytes_up;
		file.tprev = now;
		file.bytes_up = bytes_up;
		
		total_up += delta_bytes;
		
		var filePercentComplete = parseInt(bytes_up / file.size * 100) + '%';
		var totalPercentComplete = parseInt(total_up / total_size * 100) + '%';
		var fileSpeed = parseInt(delta_bytes / delta_t / 1000) +"kB/s";

		// update the Bootstrap progress bar with the new percentage
		$('#file-'+i+'-progress-bar').text(file.name + '  ' +fileSpeed);
		$('#file-'+i+'-progress-bar').width(filePercentComplete);
		
		$('#total-progress-bar').text(nb_done + ' / ' + nb_files + ' file(s)');
		$('#total-progress-bar').width(totalPercentComplete);
	}
});

});

// Ref: xhrSend from barehttp.js & hex-view.html to read file
function xhr_put_file(file, success, error, progress, opt_prms, opt_byte_from) {
	var prms = opt_prms || {};
	var root_url = prms.root_url || '/static/uploads/';

	// chunk upload
	var chunk_size = prms.chunk_size || 750*1000;
	var chunk_byte_from = opt_byte_from || 0;
	var chunk_byte_end =  Math.min(chunk_byte_from+chunk_size, file.size);
	
	var xhr = new XMLHttpRequest();
	xhr.upload.addEventListener("progress", uploadProgress, false);
	xhr.addEventListener("load", uploadComplete, false);
	xhr.addEventListener("error", uploadFailed, false);
	xhr.addEventListener("abort", uploadCanceled, false);
	xhr.timeout = 15000;
	
	function uploadComplete(e) { 
		if (chunk_byte_end<file.size) {
			xhr_put_file(file, success, error, progress, prms, chunk_byte_end);
		} else {
			console.log("upload complete. "+e); success(e);
		} 
	}
	function uploadFailed(e) { console.log("upload failed. "+e); error(e); }
	function uploadCanceled(e) { console.log("upload canceled. "+e); error(e); }
	function uploadProgress(e) { console.log("upload progress. loaded "+e.loaded+" / total "+e.total+". "+e); progress(e) }
	
	xhr.open('PUT', root_url+file.name, true); // MUST BE LAST LINE BEFORE YOU SEND (true for async)
	xhr.setRequestHeader("Content-Type", "application/octet-stream");
	xhr.setRequestHeader("Content-Range", "bytes "+chunk_byte_from+"-"+chunk_byte_end+"/*");
	
	//xhr.send(file);

	var reader = new FileReader();
	reader.onerror = file_reader_error
	reader.onload = file_reader_done
	//reader.readAsArrayBuffer(file);
	
	var blob = file.slice(chunk_byte_from, chunk_byte_end);
	reader.readAsArrayBuffer(blob);
	
	function file_reader_error(evt) { 
		info_msg(evt.target.error); 
		error(evt); 
	};
	function file_reader_done(evt) { 
		xhr.send(reader.result);
	};
}

function info_msg(msg) {
	console.log(msg);
	$('#log').append(msg+"<br/>");
}