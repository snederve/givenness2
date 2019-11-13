// KEY element
PennController._AddElementType("Key", function(PennEngine) {

    // This is executed when Ibex runs the script in data_includes (not a promise, no need to resolve)
    this.immediate = function(id, keys){
        if (Number(keys)>0)
            this.keys = String.fromCharCode(keys).toUpperCase();
        else if (typeof(keys)=="string")
            this.keys = keys.toUpperCase();
        else
            console.warn("Invalid key(s) passed to new Key "+id+" (should be a string or a key code number)", keys);
    };

    // This is executed when 'newAudio' is executed in the trial (converted into a Promise, so call resolve)
    this.uponCreation = function(resolve){
        this.pressed = [];
        this.log = false;
        PennEngine.controllers.running.safeBind($(document),"keydown",(e)=>{
            if (this.keys.length==0 || this.keys.match(RegExp(String.fromCharCode(e.which),"i")))
                this.press.apply(e.which);
        });
        this.press = key=>{                                 // (Re)set press upon creation for it can be modified during trial
            this.pressed.push(["Key", key, Date.now(), "NULL"]);
        };
        resolve();
    }

    // This is executed at the end of a trial
    this.end = function(){
        if (this.log)
            for (let key in this.pressed)                   // Save any clicks if logging
                PennEngine.controllers.running.save(this.type, this.id, ...this.pressed[key]);
    };

    this.value = function(){                                // Value is last key that was pressed
        if (this.pressed.length)
            return String.fromCharCode(this.pressed[this.pressed.length-1][1]).toUpperCase();
        else
            return "";
    };
    
    this.actions = {
        wait: function(resolve, test){
            if (test == "first" && this.pressed.length)     // If first and already pressed, resolve already
                resolve();
            else {                                          // Else, extend remove and do the checks
                let resolved = false;
                let oldPress = this.press;
                this.press = key => {
                    oldPress.apply(this, [key]);
                    if (resolved)
                        return;
                    if (test instanceof Object && test._runPromises && test.success)
                        test._runPromises().then(value=>{   // If a valid test command was provided
                            if (value=="success"){
                                resolved = true; 
                                resolve();                  // resolve only if test is a success
                            }
                        });
                    else{                                    // If no (valid) test command was provided
                        resolved = true;
                        resolve();                          // resolve anyway  
                    }
                };
            }
        }
    };
    
    this.settings = {
        log: function(resolve,  ...what){
            this.log = true;
            resolve();
        }
    };

    this.test = {
        pressed: function(keys, first){
            for (let k in this.pressed){
                let keyCode = this.pressed[k][1];
                if (Number(keys)>0 && keyCode == key)       // If one keycode matches, true
                    return true;
                else if (typeof(keys)=="string" && keys.match(new RegExp(String.fromCharCode(keyCode),"i")))
                    return true;                            // If one key that was pressed is contained in keys, true
                else if (typeof(keys)=="undefined")
                    return true;                            // Inside the for loop: at least one key was pressed, true
                else if (first)
                    return false;                           // If only checking first and no match, false
            }
            return false;                                   // No match, false
        }
    };

});