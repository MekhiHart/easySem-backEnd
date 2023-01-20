const express = require("express")
const app = express();
const puppeteer = require("puppeteer")
const PORT = process.env.PORT || 3001; // Chooses between ports; first parameter is automatic (SEE fullstack web app article from freeCodeCamp)

// import $ from "jquery"
// const $ = require("jquery")


// * Socket.io add ons
const http = require("http")
const {Server} = require("socket.io")
const cors = require("cors");
const { create } = require("domain");
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

    // console.log("return data: ", returnData)
    
    
    
  }) //socket.on

  socket.on("generateSchedule", async (selectedClasses) =>{
    async function createCourseBlock(pageInstance,requestedClasses){
      const classList = requestedClasses.map(classObj => classObj.valueName)
      // const xpathResult = document.evaluate(xpathExpression, contextNode, namespaceResolver, resultType, result);
      // !  For some reason, variables are being seen as undefined if the variable is read
      // const query_sectionTable = ".sectionTable > tbody > tr > " // query base for all target queries
      // const query_section = query_sectionTable +  "th[scope=row]"
      // const query_classNumber = query_sectionTable + "th+td"
      // const query_days = query_sectionTable + "th+td+td+td+td+td+td" // * hard coded td's... lol; refractor later
      // const query_time = query_sectionTable + "th+td+td+td+td+td+td+td"
      // const query_isOpen = query_sectionTable + "th+td+td+td+td+td+td+td+td"
      // const query_location = query_sectionTable + "th+td+td+td+td+td+td+td+td+td"
      // const query_instructor = query_sectionTable + "th+td+td+td+td+td+td+td+td+td+td"
      

      // ! add a parameter for evaluate to pass in query variables
      const courseBlock = { // it will depend in each index if the index for its isOpen is true
        section: await pageInstance.evaluate( () => (Array.from(document.querySelectorAll("#pageContent > div.subjectContainer > div.session > div:nth-child(1) > div + .sectionTable > tbody > tr > th[scope=row]")).map(child => child.textContent))), // section
        classNumber: await pageInstance.evaluate( () => (Array.from(document.querySelectorAll(".sectionTable > tbody > tr > " + "th+td")).map(child => child.textContent))), //classNumber
        days: await pageInstance.evaluate( () => (Array.from(document.querySelectorAll(".sectionTable > tbody > tr > " + "th+td+td+td+td+td+td")).map(child => child.textContent))), //days
        time: await pageInstance.evaluate( () => (Array.from(document.querySelectorAll(".sectionTable > tbody > tr > " + "th+td+td+td+td+td+td+td")).map(child => child.textContent))), //time
        isOpen: await pageInstance.evaluate( () => (Array.from(document.querySelectorAll(".sectionTable > tbody > tr > " +  "th+td+td+td+td+td+td+td+td")).map(child => child.innerHTML))), // open seats
        location: await pageInstance.evaluate( () => (Array.from(document.querySelectorAll(".sectionTable > tbody > tr > " + "th+td+td+td+td+td+td+td+td+td")).map(child => child.textContent))), //location
        instructor: await pageInstance.evaluate( () => (Array.from(document.querySelectorAll(".sectionTable > tbody > tr > " + "th+td+td+td+td+td+td+td+td+td+td")).map(child => child.textContent))), //instructor
      } //courseBlock

      // courseBlock.section = await pageInstance.evaluate( () => (Array.from(document.querySelectorAll(".sectionTable > tbody > tr > th+td+td+td+td+td+td")).map(child => child.textContent)))

      // example: BLAW 309 - CONSUMER LEGAL & ECON ENVIRON
      // console.log("Requested Classes: ",classList)
      console.log("Classlist var: ",classList[0])
      const courseBlocks = await pageInstance.evaluate( (className) =>{ // * Returns an array of all CSULB majors
        return Array.from(Array.from(document.querySelectorAll(".courseHeader > h4")).find(child => child.textContent === className).parentElement.parentElement.querySelectorAll('.sectionTable > tbody > tr > th[scope=row]')).map(child => child.textContent)// ! Need to pass in an argument for .evaluate in order to fix reference error
      },classList[0]) //courseBlocks

      // const courseBlocks = await pageInstance.evaluate("\\.courseHeader[contains('309')]",document.body,null.XPath)
      // // ! need to find the css selector of the .courseHeader
      // console.log("Course Block: ",courseBlock)

      // console.log(courseBlocks)

  
        console.log("courseBlocks inside func: ",courseBlocks)
    } //! createCourseBlock


    const browser  = await puppeteer.launch()
    const page = await browser.newPage()
    const returnData = selectedClasses.map(classObj => ({
      className: classObj.valueName,
      openSeats: []
    }))

    console.log("return data: ",returnData)
    // console.log("Selected Classes: ",selectedClasses)
    for (let i=0; i<selectedClasses.length; i++){ // itereates through each requested class
      const currentClass = selectedClasses[i]
      const requestedClasses = currentClass.availableClasses.filter(classObj => classObj.isSelected)
      const type = currentClass.type
      const categoryName = currentClass.valueName
      const abbreviation = getAbbreviation(categoryName,type)
      const url = `http://web.csulb.edu/depts/enrollment/registration/class_schedule/Spring_2023/${type === "byMajor" ? "By_College" : "By_GE_Requirement"}/${abbreviation}.html`
      await page.goto(url)

      createCourseBlock(page,requestedClasses)
      

      // const test = courseBlocks[0]
      // console.log("Test ",test.length)
      // console.log("From server Course Blocks: ",courseBlocks)
      // socket.emit("recieve_GeneratedSchedule",courseBlocks)

      // courseBlocks[0][0].forEach(element => console.log(element))
      

      // const requestedCourseBlocks = requestedClasses.map(requestedClass => {

      // })

      // console.log("requested clases ",requestedClasses )
      // console.log("Course Blocks: ",courseBlocks)


    }

    await browser.close()
  })//! generateSchedule
}) // io.on


server.listen(PORT, () =>{
  console.log(`Server listening on ${PORT}`)
})



