// VOICERECORDER element
PennController._AddElementType("VoiceRecorder", function(PennEngine) {

    // ====== INTERNAL SETTINGS AND FUNCTIONS ====== //
    //
    // The permission message displayed when the user is asked for access to the recording device
    let permissionMessage = "This experiment collects voice recording samples from its participants. "+
        "Your browser should now be prompting a permission request to use your recording device (if applicable). "+
        "By giving your authorization to record, and by participating in this experiment, "+
        "you are giving permission to the designer(s) of this experiment to anonymously collect "+
        "the voice samples recorded during this experiment. "+
        "The output audio files will be uploaded to and hosted on a server designated by the experimenter(s). "+
        "If you accept the request, a label will remain visible at the top of this window throughout the whole experiment, "+
        "indicating whether you are being recorded.";
        //"You will be given the option to download a copy of the archive of your audio recordings before it is uploaded.";

    // The text to click to consent
    let authorizationMessage = "By clicking this link I understand that I grant this experiment's script access "+
        "to my recording device for the purpose of uploading voice recordings "+
        "to the server designated by the experimenter(s).";

    let mediaRecorder;              // The recording object
    let audioStreams = [];          // This array contains all the samples recorded so far
    let uploadURL = "";             // The URL to the PHP file that saves the archive
    let initiated = false;          // Whether PennController.InitiateRecorder has been called
    let currentVoiceElement;        // The voice element currently active
    let statusElement;              // The top-right DOM element indicating whether it is currently recording

    // This controller MUST be manually added to items and specify a URL to a PHP file for uploading the archive
    PennController.InitiateRecorder = function(saveURL, message) {
        if (!typeof(url)=="string" || !saveURL.match(/^http.+/i))
            throw Error("VoiceRecorder's save URL is incorrect", saveURL);
        uploadURL = saveURL;                                    // Assign a URL
        initiated = true;                                       // Indicate that recorder has been initiated
        let controller = PennEngine.controllers.new();          // Create a new controller
        controller.id = "InitiateRecorder";
        controller.runHeader = false;                           // Don't run header and footer
        controller.runFooter = false;
        PennEngine.controllers.list.pop();                      // Remove from PennEngine's list immediately (not a 'real' controller)
        controller.sequence = ()=>new Promise(resolve=>{
            let controller = PennEngine.controllers.running;    // In SEQUENCE, controller is the running instance
            if (!navigator.mediaDevices)                        // Cannot continue if no media device available!
                return controller.element.append($("<p>Sorry, you cannot complete this experiment because your browser does not support voice recording.</p>"));
            if (!message)                                       // See top of file for permissionMessage
                message = permissionMessage;
            controller.element.append($("<p>"+message+"</p>")); // Show message on screen
            let constraints = { audio: true };                  // Retrieve audio only
            let chunks = [];                                    // The chunks of audio streams recorded
            navigator.mediaDevices.getUserMedia(constraints)
            .then(function(stream) {                            // Create the mediaRecorder instance
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.onstop = function(e) {            // When a recording is complete
                    statusElement.css({'font-weight': "normal", color: "black", 'background-color': "lightgray"});
                    statusElement.html("Not recording");        // Indicate that recording is over in status bar
                    currentVoiceElement.filename = 'msr-' + (new Date).toISOString().replace(/:|\./g, '-') + '.ogg';// Unique filename
                    currentVoiceElement.blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });         // Blob from chunks
                    currentVoiceElement.audioPlayer.src = URL.createObjectURL(currentVoiceElement.blob);    // Can replay now
                    chunks = [];                                                                                // Reset chunks
                    currentVoiceElement = null;                                                                 // Reset current element
                };
                mediaRecorder.onstart = function(e) {           // When a recording starts
                    statusElement.css({'font-weight': "bold", color: "white", 'background-color': "red"});
                    statusElement.html("Recording...");         // Indicate it in the status bar
                }
                mediaRecorder.ondataavailable = function(e) {   // Add chunks as they become available
                    chunks.push(e.data);
                };
                controller.element.append(                      // Add the consent link to the page
                    $("<a>"+authorizationMessage+"</a>")
                        .addClass("Message-continue-link")
                        .click(resolve)                         // Resolve sequence upon click
                );
                statusElement = $("<div>Not recording</div>");  // Initially not recording
                statusElement.css({
                    position: "fixed",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",              // Trick to center (-width/2)
                    padding: "2px",
                    'background-color': "lightgray"
                });
                $("#bod").append(statusElement);                // Add status bar
        
            })
            .catch(function(err) {                              // Could not get audio device
                controller.element.append($("<p>The following error occurred: " + err + "</p>"));
                return;
            });
        });
        return controller;
    };

    // Handle uploading of the results automatically
    let oldModify = window.modifyRunningOrder;          // Trick: use Ibex's modifyRunningOrder to probe sequence of trials
    window.modifyRunningOrder = function (ro){          // Add the upload step automatically when sequence has been built
        if (oldModify instanceof Function)
            ro = oldModify.apply(this, [ro]);
        if (!initiated)                                 // If InitiateRecorder has not been called, leave running order as is
            return ro;
        let manualUpload = false;                       // Whether the sequence contains manual uploading of the results
        let sendResultsID = [-1,-1];                    // Item + Element IDs of the __SendResults__ controller
        for (let item = 0; item < ro.length; ++item) {  // Go through each element of each item in the running order
            for (let element = 0; element < ro[item].length; ++element) {
                if (ro[item][element].controller == "PennController" && ro[item][element].options.id == "UploadRecordings") {
                    manualUpload = true;                // Uploading of recordings is manual
                    if (sendResultsID[0]>=0)            // If __SendResults__ was found before
                        alert("WARNING: upload of voice archive set AFTER sending of results; check the 'items' and 'shuffleSequence' variables.");
                }
                else if (ro[item][element].controller == "__SendResults__" && sendResultsID[0]<0 && !manualUpload)
                    sendResultsID = [item, element];    // Found __SendResults__: store item+element IDs
            }
        }
        if (!manualUpload) {                            // If no manual upload, add the upload controller before __SendResults__
            let uploadController = PennEngine.controllers.new();
            uploadController.id = "UploadRecordings";
            uploadController.runHeader = false;         // Don't run header and footer
            uploadController.runFooter = false;
            uploadController.sequence = ()=>new Promise(resolve=>{
                let controller = PennEngine.controllers.running;    // In SEQUENCE, controller is running instance
                controller.element.append($("<p>Please wait while the archive is being uploaded to the server...</p>"));
                let zip = new PennEngine.utils.JSZip(); // Create the object representing the zip file
                for (let s in audioStreams)             // Add each recording to the zip instance
                    zip.file(audioStreams[s].name, audioStreams[s].data);
                zip.generateAsync({
                    compression: 'DEFLATE',
                    type: 'blob'
                }).then(function(zc) {                  // Generation/Compression of zip is complete
                    PennController.downloadVoiceRecordingsArchive = ()=>saveAs(zc, "VoiceRecordingsArchive.zip");
                    let fileName = 'msr-' + (new Date).toISOString().replace(/:|\./g, '-') + '.zip';
                    var fileObj = new File([zc], fileName); // Create file object to upload with uniquename
                    var fd = new FormData();                // Submission-friendly format
                    fd.append('fileName', fileName);
                    fd.append('file', fileObj);
                    fd.append('mimeType', 'application/zip');
                    var xhr = new XMLHttpRequest();     // XMLHttpRequest rather than jQuery's Ajax (mysterious CORS problems with jQuery 1.8)
                    xhr.open('POST', uploadURL, true);
                    xhr.onreadystatechange = ()=>{
                        if (xhr.readyState == 4){       // 4 means finished and response ready
                            controller.save("PennController", "UploadRecordings", "Filename", fileName, Date.now(), "NULL");
                            if (xhr.status == 200 && !xhr.responseText.match(/problem|error/i)) // Success
                                controller.save("PennController", "UploadRecordings", "Status", "Success", Date.now(), "NULL");
                            else {                                                              // Error
                                alert("There was an error uploading the recordings ("+xhr.responseText+").");
                                console.warn('Ajax post failed. ('+xhr.status+')', xhr.responseText);
                                controller.save("PennController", "UploadRecordings", "Status", "Failed", Date.now(), 
                                                "Error Text: "+xhr.responseText+"; Status: "+xhr.status);
                            }
                            resolve();                  // Request finished: end of 'trial'
                        } 
                    };
                    xhr.send(fd);                       // Send the request
                });
            });
            let uploadElement = new DynamicElement("PennController", uploadController);
            if (sendResultsID[0]>=0)                    // Manual __SendResults__, add upload controller before it
                ro[sendResultsID[0]].splice(sendResultsID[1], 0, uploadElement);
            else                                        // Else, just add uploadElement at the end
                ro.push([uploadElement]);
        }
        return ro;                                      // Return new running order
    };
    //
    // ==== END INTERNAL SETTINGS AND FUNCTIONS ==== //


    this.immediate = function(id){
        // void
    };

    this.uponCreation = function(resolve){
        if (typeof(mediaRecorder)=="undefined")
            throw Error("recorder not initiated. Make sure the sequence of items contains an InitiateRecorder PennController.");
        this.log = false;
        this.recordings = [];
        this.recording = false;
        this.audioPlayer = document.createElement("audio");                             // To play back recording
        this.jQueryElement = $("<span>").addClass("PennController-"+this.type+"-ui");   // The general UI 
        let recordButton = $("<button>").addClass("PennController-"+this.type+"-record");// The record button
        let recordStatus = $("<div>").addClass("PennController-"+this.type+"-status");  // Small colored dot inside record button
        let stopButton = $("<button>").addClass("PennController-"+this.type+"-stop");   // The stop button
        let stopInner = $("<div>");                                                     // The brownish/reddish square
        let playButton = $("<button>").addClass("PennController-"+this.type+"-play");   // The play button
        let playInner = $("<div>");                                                     // The green triangle
        $([recordButton, stopButton, playButton]).each(function(){ this.css({width: "25px", height: "25px", position: "relative"}); });
        $([recordStatus, stopInner, playInner]).each(function(){ this.css({position: "absolute", left: "2px", top: "4px", width: "15px", height: "15px"}); });
        recordButton.css({'background-color': "red", 'border-radius': "50%", "margin-right": "10px"});
        recordStatus.css({'background-color': "brown", 'border-radius': "50%", left: "6px", top: "6px", width: "10px", height: "10px" });
        stopInner.css({ 'background-color': "brown" });
        playInner.css({                                                                 // Triangles are more complicated
            width: 0, height: 0, 'background-color': "transparent", padding: 0,
            'border-top': "7.5px solid transparent", 'border-bottom': "7.5px solid transparent",
            'border-right': "0px solid transparent", 'border-left': "15px solid green"
        });

        let showPlay = function(enabled){                                               // Show play triangle after recording
            playButton.css("display", "inline-block");
            stopButton.css("display", "none");
            if (enabled){
                playInner.css('border-left', "15px solid green");
                playButton.attr("disabled", false);
            }
            else {
                playInner.css('border-left', "15px solid gray");
                playButton.attr("disabled", true);
            }
        };
        let showStop = function(enabled){                                               // Show stop square while recording/playing
            stopButton.css("display", "inline-block");
            playButton.css("display", "none");
            if (enabled){
                stopInner.css('background-color', "brown");
                stopButton.attr("disabled", false);
            }
            else {
                stopInner.css('background-color', "gray");
                stopButton.attr("disabled", true);
            }
        };
        showPlay(false);                                                                // Start by showing (disabled) triangle
        
        let statusInterval = null;
        recordButton.click(()=>{                                                        // Click on RECORD button
            if (this.audioPlayer.currentTime>0){
                this.audioPlayer.pause();                                               // stop playback
                this.audioPlayer.currentTime = 0;
                showPlay(false);                                                        // show disabled play triangle
            }
            if (this.recording){                                                        // while recording      ===>
                this.stop();                                                            // stop recording
                this.recording = false;
                clearInterval(statusInterval);                                          // stop indiciator's blinking
                recordStatus.css("background-color","brown");                           // change indicator's color
                showPlay(true);                                                         // show play triangle for playback
            }
            else {                                                                      // while NOT recording  ===>
                recordStatus.css("background-color", "lightgreen");                     // change indicator's color
                statusInterval = setInterval(()=>{
                    if (recordStatus.css("background-color") == "rgb(255, 255, 255)")
                        recordStatus.css("background-color", "lightgreen");             // blink betwen green
                    else
                        recordStatus.css("background-color", "white");                  // and white
                }, 750);
                showPlay(false);                                                        // show disabled play triangle
                this.recording = true;
                this.start();                                                           // start recording
            }
        });
        playButton.click(()=>{                                                          // Click on PLAY button
            showStop(true);                                                             // show stop square
            this.audioPlayer.currentTime = 0;                                           // start from stream's beginning
            this.audioPlayer.play();                                                    // and play back
        });
        stopButton.click(()=>{                                                          // Click on STOP button
            if (this.audioPlayer.currentTime>0){
                this.audioPlayer.pause();                                               // stop playback
                this.audioPlayer.currentTime = 0;
                showPlay(true);                                                         // show play triangle
            }
        });
        this.audioPlayer.onended = ()=>showPlay(true);                                  // show play triangle again after playback

        this.start = ()=>{
            this.recording = true;
            this.recordings.push(["Recording", "Start", Date.now(), "NULL"]);
            mediaRecorder.start();
        };

        this.stop = ()=>{
            this.recording = false;
            this.recordings.push(["Recording", "Stop", Date.now(), "NULL"]);
            currentVoiceElement = this;
            mediaRecorder.stop();                                                       // This will look at currentVoiceElement
        };

        this.jQueryElement.append(
            recordButton.append(recordStatus)
        ).append(
            playButton.append(playInner)
        ).append(
            stopButton.append(stopInner)
        );
        resolve();
    }
    
    this.end = function(){
        if (this.blob)
            audioStreams.push({
                name: this.filename,
                data: this.blob
            });
        if (this.log){
            for (let r in this.recordings)
                PennEngine.controllers.running.save(this.type, this.id, ...this.recordings[r]);
            if (this.blob)
                PennEngine.controllers.running.save(this.type, this.id, "Filename", this.filename, Date.now(), "NULL");
        }
    };

    this.value = function(){        // Value is blob of recording
        return this.blob;
    };
    

    this.actions = {
        play: function(resolve){
            if (this.audioPlayer && this.audioPlayer.src){
                this.audioPlayer.currentTime = 0;
                this.audioPlayer.play();
            }
            resolve();
        },
        record: function(resolve){
            this.start();
            resolve();
        },
        stop: function(resolve){
            this.stop();
            if (this.audioPlayer && this.audioPlayer.src)
                this.audioPlayer.pause();
            this.audioPlayer.currentTime = 0;
            resolve();
        },
        wait: function(resolve, test){
            if (test == "first" && this.recordings.length)  // If first and has already recorded, resolve already
                resolve();
            else {                                          // Else, extend stop and do the checks
                let resolved = false;
                let originalStop = this.stop;
                this.stop = ()=>{
                    originalStop.apply(this);
                    if (resolved)
                        return;
                    if (test instanceof Object && test._runPromises && test.success)
                        test._runPromises().then(value=>{   // If a valid test command was provided
                            if (value=="success"){
                                resolved = true;
                                resolve();                  // resolve only if test is a success
                            }
                        });
                    else{                                   // If no (valid) test command was provided
                        resolved = true;
                        resolve();                          // resolve anyway
                    }
                };
            }
        }
    };
    
    this.settings = {
        disable: function(resolve){
            this.disabled = true;
            this.origin.element.find("button.PennController-"+this.type+"-record").attr("disabled", true);
            resolve();
        },
        enable: function(resolve){
            this.disabled = false;
            this.origin.element.find("button.PennController-"+this.type+"-record").removeAttr("disabled");
            resolve();
        },
        once: function(resolve){
            if (this.recordings.length){
                this.disabled = true;
                this.origin.element.find("button.PennController-"+this.type+"-record").attr("disabled", true);
            }
            else{
                let originalStop = this.stop;
                this.stop = ()=>{
                    if (originalStop instanceof Function)
                        originalStop.apply(this);
                    this.disabled = true;
                    this.origin.element.find("button.PennController-"+this.type+"-record").attr("disabled", true);
                }
            }
            resolve();
        },
        log: function(resolve){
            this.log = true;
            resolve();
        }
    };
    
    this.test = {
        // Every test is used within a Promise back-end, but it should simply return true/false
        hasPlayed: function(){
            return this.hasPlayed;
        }
        ,
        playing: function(){
            return this.audio.currentTime&&!this.audio.paused;
        }
        ,
        recorded: function(){
            return this.blob;
        }
    };

});

// Handler generating a HTML button to download the zip archive containing the voice recordings
PennController.DownloadVoiceButton = function (text) {
    return "<button type=\"button\" onclick=\""+
           "if (PennController.hasOwnProperty('downloadVoiceRecordingsArchive'))"+
           "  PennController.downloadVoiceRecordingsArchive();"+
           "  "+
           "else"+
           "  alert('ERROR: could not find an archive for voice recordings');"+
           "\">"+text+"</button>";
};