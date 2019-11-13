// HTML element
PennController._AddElementType("Html", function(PennEngine) {

    // Imported from Form.js
    function alertOrAddError(name, error) {
        var ae = $("label.error[for=__ALL_FIELDS__]");
        if (ae.length > 0) {
            ae.addClass("Form-error-text").text(error);
            return;
        }
        var e = $("label.error[for=" + escape(name) + "]");
        if (e.length > 0)
            e.addClass("Form-error-text").text(error);
        else 
            alert(error);
    }

    // Tests whether the form has been completely filled (imported and adapted from Form.js)
    function isComplete(){
        var dom = this.jQueryElement[0];

        var inps = $(dom).find("input[type=text]");
        var tas = $(dom).find("textarea");
        for (var i = 0; i < tas.length; ++i) { inps.push(tas[i]); }

        for (var i = 0; i < inps.length; ++i) {
            var inp = $(inps[i]);

            if (inp.hasClass("obligatory") && ((! inp.attr('value')) || inp.attr('value').match(/^\s*$/)))
                return false;
        }
        console.log("All obligatory textboxes are filled");

        var checks = $(dom).find("input[type=checkbox]");
        for (var i = 0; i < checks.length; ++i) {
            var check = $(checks[i]);

            // Checkboxes with the 'obligatory' class must be checked.
            if (!check.attr('checked') && check.hasClass('obligatory'))
                return false;
        }
        console.log("All obligatory checkboxes are checked");

        var rads = $(dom).find("input[type=radio]");
        // Sort by name.
        var rgs = { };
        for (var i = 0; i < rads.length; ++i) {
            var rad = $(rads[i]);
            if (rad.attr('name')) {
                if (! rgs[rad.attr('name')])
                    rgs[rad.attr('name')] = [];
                rgs[rad.attr('name')].push(rad);
            }
        }
        for (var k in rgs) {
            // Check if it's oblig.
            var oblig = false;
            var oneIsSelected = false;
            for (var i = 0; i < rgs[k].length; ++i) {
                if (rgs[k][i].hasClass('obligatory')) oblig = true;
                if (rgs[k][i].attr('checked'))
                    oneIsSelected = true;
            }
            
            if (oblig && (!oneIsSelected))
                return false;
        }
        console.log("All obligatory radios are selected");
        return true;
    }

    this.immediate = function(id, html){
        this.html = html;
    };

    this.uponCreation = function(resolve){
        if (CHUNKS_DICT.hasOwnProperty(this.html))      // Check CHUNKS_DICT upon creation of element
            this.jQueryElement = $("<div>").html(htmlCodeToDOM({include: this.html}));
        else
            this.jQueryElement = $("<div>").html(this.html);
        this.log = false;
        resolve();
    };

    this.end = function(){
        if (!this.log)
            return;
        // Imported from Form.js (and adapted)
        var dom = this.jQueryElement[0];

        var inps = $(dom).find("input[type=text]");
        var tas = $(dom).find("textarea");
        for (var i = 0; i < tas.length; ++i) { inps.push(tas[i]); }

        for (var i = 0; i < inps.length; ++i) {
            var inp = $(inps[i]);

            PennEngine.controllers.running.save(
                this.type,
                this.id,
                csv_url_encode(inp.attr('value')),
                csv_url_encode(inp.attr('name')),
                Date.now(),
                "text input"
            );
        }

        var checks = $(dom).find("input[type=checkbox]");
        for (var i = 0; i < checks.length; ++i) {
            var check = $(checks[i]);

            PennEngine.controllers.running.save(
                this.type,
                this.id,
                check.attr('name'),
                check.attr('checked') ? "checked" : "unchecked", 
                Date.now(), 
                "checkbox"
            );
        }

        var rads = $(dom).find("input[type=radio]");
        // Sort by name.
        var rgs = { };
        for (var i = 0; i < rads.length; ++i) {
            var rad = $(rads[i]);
            if (rad.attr('name')) {
                if (! rgs[rad.attr('name')])
                    rgs[rad.attr('name')] = [];
                rgs[rad.attr('name')].push(rad);
            }
        }
        for (var k in rgs) {
            // Check if it's oblig.
            var oneIsSelected = false;
            var oneThatWasSelected;
            for (var i = 0; i < rgs[k].length; ++i) {
                if (rgs[k][i].attr('checked')) {
                    oneIsSelected = true;
                    oneThatWasSelected = i;
                }
            }
            if (oneIsSelected)
                PennEngine.controllers.running.save(
                    this.type,
                    this.id,
                    rgs[k][0].attr('name'),
                    rgs[k][oneThatWasSelected].attr('value'), 
                    Date.now(), 
                    "radio button"
                );
        }
    };

    this.value = function(){                                    // Value is whether it's complete
        return isComplete.apply(this);
    };

    this.actions = {
        warn: function(resolve){
            var dom = this.jQueryElement[0];

            var inps = $(dom).find("input[type=text]");
            var tas = $(dom).find("textarea");
            for (var i = 0; i < tas.length; ++i) { inps.push(tas[i]); }

            for (var i = 0; i < inps.length; ++i) {
                var inp = $(inps[i]);

                if (inp.hasClass("obligatory") && ((! inp.attr('value')) || inp.attr('value').match(/^\s*$/)))
                    alertOrAddError(inp.attr('name'), "The \u2018" + inp.attr('name') + "\u2019 field is obligatory.");
            }

            var checks = $(dom).find("input[type=checkbox]");
            for (var i = 0; i < checks.length; ++i) {
                var check = $(checks[i]);

                // Checkboxes with the 'obligatory' class must be checked.
                if (! check.attr('checked') && check.hasClass('obligatory'))
                    alertOrAddError(check.attr('name'), "You must check the " + check.attr('name') + " checkbox to continue.");
            }

            var rads = $(dom).find("input[type=radio]");
            // Sort by name.
            var rgs = { };
            for (var i = 0; i < rads.length; ++i) {
                var rad = $(rads[i]);
                if (rad.attr('name')) {
                    if (! rgs[rad.attr('name')])
                        rgs[rad.attr('name')] = [];
                    rgs[rad.attr('name')].push(rad);
                }
            }
            for (var k in rgs) {
                // Check if it's oblig.
                var oblig = false;
                var oneIsSelected = false;
                for (var i = 0; i < rgs[k].length; ++i) {
                    if (rgs[k][i].hasClass('obligatory')) oblig = true;
                    if (rgs[k][i].attr('checked'))
                        oneIsSelected = true;
                }
                
                if (oblig && (! oneIsSelected))
                    alertOrAddError(rgs[k][0].attr('name'), "You must select an option for \u2018" + rgs[k][0].attr('name') + "\u2019.");
            }
            resolve();
        }
    };

    this.settings = {
        log: function(resolve){
            this.log = true;
            resolve();
        }
    };

    this.test = {
        complete: function(){
            return isComplete.apply(this);
        }
    }

});