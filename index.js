const express = require("express")
const app = express();
const puppeteer = require("puppeteer")
const PORT = process.env.PORT || 3001; // Chooses between ports; first parameter is automatic (SEE fullstack web app article from freeCodeCamp)



// * Socket.io add ons
const http = require("http")
const {Server} = require("socket.io")
const cors = require("cors")
app.use(cors())

const server = http.createServer(app)
const io = new Server(server,{
  cors:{
    origin:"http://localhost:3000",
    methods: ["GET","POST"],
  }
})




// ! Another way to create a server


// app.use(express.static(".\\client\\src")) // *Don't know what this does
// app.use(express.json()) // * Don't know what this does


/* 
HTTP requests
fetch - gets data from server to client
post - adds data to server from client

*/

async function start(){
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto(url)
  await page.screenshot({path:"amazing.png"})
  await browser.close()
}


// app.get("/api", (req,res) =>{ // ! This is an API!
//     res.json({message:"Hello from server"})
// })

app.get('/screenshot', async (req, res) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url); // URL is given by the "user" (your client-side application)
  const screenshotBuffer = await page.screenshot();

  // Respond with the image
  res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': screenshotBuffer.length
  });
  res.end(screenshotBuffer);

  await browser.close();
})

app.get("/classes", async (req,res) =>{
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  const url = "http://web.csulb.edu/depts/enrollment/registration/class_schedule/Spring_2023/By_Subject/ACCT.html"
  await page.goto(url)

  const names = await page.evaluate(() =>{
    return Array.from(document.querySelectorAll(".courseHeader h4")).map(name => name.textContent)
  })
  
  res.json({message:names})

  await browser.close()
})


app.get("/get_collegeMajors", async (req,res) =>{
  const browser  = await puppeteer.launch()
  const page = await browser.newPage()
  const url = "http://web.csulb.edu/depts/enrollment/registration/class_schedule/Spring_2023/By_College/index.html" // TODO change into dynamic html
  await page.goto(url)

  let collegeMajors = await page.evaluate( () =>{ // * Returns an array of all CSULB majors
    return Array.from(document.querySelectorAll(".indexList ul li")).map(name => name.textContent)
  })

  collegeMajors = [...new Set(collegeMajors)] // * Removes duplicates from array

  collegeMajors = collegeMajors.map(majorName => ({valueName:majorName,isSelected:false})) // *Needs to have a value the same as GE


  res.json(collegeMajors) // * Returns array of objects

  await browser.close()
})

app.get("/get_collegeGE" ,async(req,res) =>{
  const browser  = await puppeteer.launch()
  const page = await browser.newPage()
  const url = "http://web.csulb.edu/depts/enrollment/registration/class_schedule/Spring_2023/By_GE_Requirement/index.html" // TODO change into dynamic html
  await page.goto(url)

  let collegeMajors = await page.evaluate( () =>{ // * Returns an array of all CSULB majors
    return Array.from(document.querySelectorAll(".indexList ol li a")).map(name => name.textContent)
  })

  collegeMajors = [...new Set(collegeMajors)] // * Removes duplicates from array

  collegeMajors = collegeMajors.map(majorName => ({valueName:majorName,isSelected:false}))


  res.json(collegeMajors) // * Returns array of objects

  await browser.close()
})

// app.post("/api", (req,res) =>{
//   // res.send("Hello from server")
//   console.log("I got a request")
//   console.log("Request: ",req)
// })




// app.listen(PORT, () => { // * Server listens to PORT
//   console.log(`Server listening on ${PORT}`);
// });

// ! FOR POST REQUESTS
io.on("connection",  (socket) => { // * Detects whenever someone connects to the website
  function getAbbreviation(name,type){ // gets url for the check boxes selected
    const idxLeft = name.indexOf("(") + 1 // + 1 removes does not invlude the parenthesis
    const idxRight = name.indexOf(")") 
    let abbreviation = name.slice(idxLeft,idxRight) // left with the abbreviation with no parethesis
    if (type === "major" || type === "byMajor"){
      return abbreviation
    }
    else{
      const targetSlash = "/"
      const replaceSlash = "-"
      const target_UD = "UD "
      const replace_UD = "UD-"
      abbreviation = abbreviation.replace(targetSlash,replaceSlash)
      abbreviation = abbreviation.replace(target_UD,replace_UD )

      return abbreviation
    }
  }

  socket.on("find_classes", async (data) =>{
    let returnData = [] // ! Data that is returned to the client
    const {selectedMajors,selectedGenEd} = data.data
    const typeMajor = "byMajor" // for url
    const typeGE = "byGE"

    const browser  = await puppeteer.launch()
    const page = await browser.newPage()

    for (let i = 0; i < selectedMajors.length; i++){ // for loop for the selected major classes
      const type = "major"
      const majorName = selectedMajors[i].valueName
      const abbreviation = getAbbreviation(majorName,type)
      const url = `https://web.csulb.edu/depts/enrollment/registration/class_schedule/Spring_2023/By_College/${abbreviation}.html` // TODO Make HTML DYNAMIC!!
      await page.goto(url) // goes to url
      const availableClasses = await page.evaluate( () =>{ // * Returns an array of all CSULB majors
        return Array.from(document.querySelectorAll(".courseHeader h4")).map(name => name.textContent)
      })
      returnData.push({valueName:majorName, type:typeMajor, availableClasses:availableClasses.map(className =>({
        valueName: className,
        isSelected: false
      }) )}) // * Push to returnData
    }
    // returnData.selectedMajors = returnData.selectedMajors.map(obj => )

    for (let i=0; i < selectedGenEd.length; i++){ // for loop for the selected GEN ed classes
      const type = "GE"
      const geName = selectedGenEd[i].valueName
      const abbreviation = getAbbreviation(geName,type)
      const url = `http://web.csulb.edu/depts/enrollment/registration/class_schedule/Spring_2023/By_GE_Requirement/${abbreviation}.html` //TODO Make HTML DYNAMIC!!
      await page.goto(url) // goes to url
      const availableClasses = await page.evaluate( () =>{ // * Returns an array of all CSULB majors
        return Array.from(document.querySelectorAll(".courseHeader h4")).map(name => name.textContent)
      })
      returnData.push({valueName:geName, type:typeGE, availableClasses:availableClasses.map(className => ({
        valueName: className,
        isSelected: false
      }))}) // * Push to returnData
    }

    await browser.close()
    socket.emit("getSelectedClasses", returnData) // Sends available classes to client

    console.log("return data: ", returnData)
    
    
    
  }) //socket.on

  socket.on("generateSchedule", async (selectedClasses) =>{

    const browser  = await puppeteer.launch()
    const page = await browser.newPage()
    for (let i=0; i<selectedClasses.length; i++){
      const currentClass = selectedClasses[i]
      const type = currentClass.type
      const abbreviation = getAbbreviation(currentClass.valueName,type)
      const url = `http://web.csulb.edu/depts/enrollment/registration/class_schedule/Spring_2023/${type === "byMajor" ? "By_College" : "By_GE_Requirement"}/${abbreviation}.html`

      console.log(" URL: ",url)
    }
    await browser.close()
  })// generateSchedule
}) // io.on


server.listen(PORT, () =>{
  console.log(`Server listening on ${PORT}`)
})



