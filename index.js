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
  socket.on("find_classes", async (data) =>{
  
    let returnData = {selectedMajors:[], selectedGenEd:[]}
    const {selectedMajors,selectedGenEd} = data.data

    const selectedGE = {nameValue:"UD B", availableClasses:[]}
    const test = await selectedMajors.map(  async  (majorObj) =>{
        const browser  = await puppeteer.launch()
        const page = await browser.newPage()
        const majorName = majorObj.valueName
        const majorSplit = majorName.split(" ") // Splites valueName into elements of an array
        let abbreviation = majorSplit[majorSplit.length - 1] // Gets abbreviation from the split, and separte each character
        const idxLeft = abbreviation.indexOf("(") + 1 // + 1 removes does not invlude the parenthesis
        const idxRight = abbreviation.indexOf(")") 
        abbreviation = abbreviation.slice(idxLeft,idxRight) // left with the abbreviation with no parethesis

        const url = `https://web.csulb.edu/depts/enrollment/registration/class_schedule/Spring_2023/By_College/${abbreviation}.html` // TODO Make HTML DYNAMIC!!
        await page.goto(url)

        const availableClasses = await page.evaluate( () =>{ // * Returns an array of all CSULB majors
          return Array.from(document.querySelectorAll(".courseHeader h4")).map(name => name.textContent)
        })

        // console.log(availableClasses)
        returnData.test = "Cow"
        console.log( majorObj.valueName, availableClasses)
        await browser.close()

        return availableClasses

      }) // forEach

      // console.log("Test: ",test)  // TODO: For some reason the "test" is resolving into a promise, and I'm unable to change returnData, fix the issuse for that future Mekhi after you come back for the trip :)

     
    // await browser.close()
  }) //socket.on
}) // io.on


server.listen(PORT, () =>{
  console.log(`Server listening on ${PORT}`)
})



