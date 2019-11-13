 //   PennController.DebugOff() 

PennController.AddTable("mytable", "https:linktomytable.com/mytable.csv");

PennController.Sequence("setcounter","consent","instructions","scaleinstr","distract", randomize("Class"), "debrief","send","thanks");

PennController.ResetPrefix(null);

var items = [

    ["setcounter", "__SetCounter__", { } ]
    ,    
    ["consent", "PennController", PennController(
        newHtml("consent", "example_intro.html")
            .settings.log()
            .print()
        ,
        newButton("consent btn", "Ich willige ein, dieses Experiment zu machen.")
            .print()
            .wait( getHtml("consent").test.complete().failure( getHtml("consent").warn() ) )
    )]
    ,
    ["instructions", "PennController", PennController(
        newHtml("instructions", "instruction_form.html")
            .print()
        ,
        newButton("continue btn", "Klicken Sie hier, um fortzufahren.")
            .print()
            .wait()
    )]
    ,
     ["scaleinstr", "PennController", PennController(
        newHtml("scale form", "Scale.html")
            .print()
        ,
        newButton("continue btn", "Weiter.")  
            .print()
            .wait( getHtml("scale form").test.complete().failure(getHtml("scale form").warn()) )
    )]
    ,     
    ["distract", "PennController", PennController(
        newHtml("distract form", "DistractionsOff.html")
            .print()
        ,
        newButton("continue btn", "Weiter.")
            .print()
            .wait( getHtml("distract form").test.complete().failure(getHtml("distract form").warn()) )
    )]
    ,      

       ["debrief", "PennController", PennController(
        newHtml("debrief", "debrief_form.html")
            .settings.log()
            .print()
        ,
         newButton("continue to confirm", "Klicken Sie hier, um fortzufahren.")
            .print()
            .wait()                       
    )] 
    ,
    
    ["send", "__SendResults__", {}]   
    ,
    ["thanks", "PennController", PennController(
        newHtml("thanks", "end_form.html")
            .settings.log()
            .print()
        ,
        newButton("continue btn", "Jag &auml;r klar.")
            .settings.bold()
     //       .print()
            .wait()                 
    )]                     
 , ];
 
 //PennController.Header(
  // defaultCanvas
  //     .settings.cssContainer("outline", "solid 1px green")
// );


 PennController.Template("mytable", // No need to setGroup: columns named "Group" are automatically detected as such
  item => PennController("Class",
  newText( "sentence" , item.Sentence )
 
  ,
    newTimer("blank", 1000)
        .settings.log()
        .start()
        .wait()
        ,
       
       newTooltip("instructions", "Klicken Sie die Leertaste, um fortzufahren.")
            .settings.size(180, 25)
            .settings.position("bottom center")
            .settings.key(" ", "no click")
        ,
        newCanvas("stimbox", 800, 160)
              .settings.css("border", "solid 1px green")
                   .settings.add(25,40,
                newText("context", item.Sentence)
                    .settings.size(700, 30)
                    
            )
                 
            .settings.add(25,80,
                 newText("sagen", item.Sagen)
                     .settings.size(700, 30)                  
           )
          
            .settings.add(25, 110,
                newText("given", item.Given)
                    .settings.italic()
                    .settings.size(700, 30)                  
            )
            
            
                .print()
            
          //  ,
         //  newCanvas("empty", 10, 10) 
         //    .settings.hidden()
          //      .print()    
          
       ,
       newTimer("transit", 1000)
            .start()
            .wait()
    ,   
        newScale("answer", 7)
            .settings.log()
          
        ,
        newCanvas("answerbox", 800, 200) 
        .settings.css("border", "solid 1px green")
            
                .settings.add(25, 25, newText("response", item.Answer) )
                .settings.add(25, 50, newText("claim", item.Claim) .settings.italic()  )
                .settings.add(25,100, newText("target", item.Question).settings.size(700, 30) )
              .settings.add(25,130, newText("labelLeft", "volkommen unnat&uuml;rlich").settings.bold() )
              .settings.add(200,130, getScale("answer").settings.size(300, 0) )
              .settings.add(500,130, newText("labeRight", "volkommen nat&uuml;rlich an").settings.bold() )
               //.settings.add(265,155, newText("labelMid", "keiner").settings.bold() )     
                         .print()    
        ,
        newText("warning","Bitte w&auml;hlen Sie eine Antwort aus.")
            .settings.hidden()
            .settings.color("red")
            .settings.bold()
            .settings.css("margin-left", 50 )
            .print()
        ,
        newButton("validate", "Weiter.")
            .settings.center()
            .print()    
            .wait(getScale("answer")
                  .test.selected()
                  .failure(getText("warning")
                           .settings.visible()
                        )
                            )              
                                ) 
                                     
                                     .log("Class", item.Class)
                                     .log("CG", item.CG)
                                     .log("position", item.Position)
                                     .log("verb", item.Verb)
                                     .log("analysis", item.analysis)
                                     .log("Number", item.Number) ) ; 
       
        
    