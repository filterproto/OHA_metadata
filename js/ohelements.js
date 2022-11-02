let forms = {}
let pages = []
let welcomeText = ""
let activePageIndex = 0

// Call initialize functions and get the website ready
await loadDataFromFiles()
initPages()
initTimeline()
updateTimeline()
updatePage()

initFormUsingUrlData()


// Initialize the page timeline ui with the proper pages
function initTimeline(){
  let num = 1;
  function addPageToTimeline(name, locked){
    let g = createFromTemplate($(".timeline-page.template"))
    g.children(".timeline-page-num").text(num)
    g.children(".timeline-page-name").text(capFirst(name))
    if(locked) g.addClass("locked")
    num += 1
  }

  for(let i = 0; i < pages.length; i++) {
    const page = pages[i]
    addPageToTimeline(page.name.toLowerCase(), page.locked)
  }

  // When clicking on a page in the timeline
  $(".timeline-page").on("click", function(){
    const pageName = $(this).children(".timeline-page-name").text()
    const pageIndex = getPageIndexFromName(pageName)
    setActivePage(pageIndex)
  })

  // Support left/right arrow keys to switch between pages
  $("body").on("keydown", function(e){
    const keyLeft = 37
    const keyRight = 39
  
    if(e.which == keyLeft) {
      setActivePage(activePageIndex - 1)
    }else if(e.which == keyRight) {
      setActivePage(activePageIndex + 1)
    }
  })
}

// Update the page timeline ui
function updateTimeline(){
  $(".timeline-page").each(function(){
    $(this).removeClass("active")

    const pageName = $(this).children(".timeline-page-name").text()
    const pageIndex = getPageIndexFromName(pageName)
    if(pageIndex === activePageIndex){
      $(this).addClass("active")
    }
  })

  const percent = activePageIndex * (100 / (pages.length - 1))
  $(".timeline-bar-progress").css("width", `${percent}%`)
  $(".timeline-page").each(function(){
    const index = getPageIndexFromName($(this).children(".timeline-page-name").text().toLowerCase())

    $(this).removeClass("finished")
    if(index < activePageIndex){
      $(this).addClass("finished")
    }
  })
}

// Update and display the current page, hiding all the other pages
function updatePage(){
  const pageName = pages[activePageIndex].name

  $(".page").each(function(){
    $(this).addClass("hide")
    if($(this).hasClass(`${pageName.replace(" ", "")}-page`)) $(this).removeClass("hide")
  })

  if(pageName === "complete"){
    const formDataStr = getFinishedFormAsBinStr()

    const formWasntFilled = formDataStr.indexOf("1") === -1
    if(formWasntFilled){
      $(".complete-page-content").addClass("hide")
      $(".complete-page-nodata").removeClass("hide")
    }else{
      $(".complete-page-content").removeClass("hide")
      $(".complete-page-nodata").addClass("hide")
    }

    const link = createReusableLink(formDataStr)
    const linkEl = $(".reusable-link")
    linkEl.text(link)
    linkEl.prop("href", link)
  }
}

// Initialize all the pages
function initPages(){
  // Initialize pages array
  pages.push({name: "welcome", locked: false})
  const formNames = Object.keys(forms)
  for(let i = 0; i < formNames.length; i++){
    pages.push({name: formNames[i], locked: false})
  }
  pages.push({name: "complete", locked: false})
  
  $(".welcome-page .page-content").text(welcomeText)

  // Create all the form pages
  for(let i = 0; i < formNames.length; i++){
    const formName = formNames[i]
    const formData = getEmptyFormData(formName)

    const formPage = createFromTemplate($(".page-form.template"))
    formPage.addClass(`${formName.replace(" ", "")}-page`)
    formPage.find(".page-form-title").text(formData.title)

    // Populate page with the proper fields
    for(let i = 0; i < formData.fields.length; i++){
      const fieldData = formData.fields[i]

      let field = createFromTemplate(formPage.find(".field.template"))
      field.find(".field-name").text(fieldData.name)
      field.find(".field-description").text(fieldData.description)
    }
  }

  // Initializes download buttons on the final "complete" page
  $(".complete-download-csv").on("click", function (){
    const finishedFormData = getFinishedForm()
    const csv = buildCSV(finishedFormData)
    download("OHMetadataChoices.csv", csv)
  })
  $(".complete-download-pdf").on("click", function (){
    const finishedFormData = getFinishedForm()
    buildAndDownloadPDF(finishedFormData)
  })

  // Make the extended checkbox hitbox toggle the checkbox, for easier clicking
  $(".field .field-checkbox-hitbox").on("mousedown", function(){
    const checkbox = $(this).siblings(".field-checkbox")
    checkbox.prop("checked", !checkbox.prop("checked"))

    // Enable prompting the user to confirm they want to leave the website, their form data will be lost if they do
    window.onbeforeunload = function() { return true }
  })
  $(".field .field-checkbox-hitbox").on("mouseenter", function(){
    const checkbox = $(this).siblings(".field-checkbox")
    checkbox.addClass("checkbox-hover")
  })
  $(".field .field-checkbox-hitbox").on("mouseleave", function(){
    const checkbox = $(this).siblings(".field-checkbox")
    checkbox.removeClass("checkbox-hover")
  })
}

// Initialize the form when using a reusable link
function initFormUsingUrlData(){
  const params = (new URL(document.location)).searchParams
  let initialFormData = params.get("data")
  if(initialFormData !== null){
    initialFormData = window.atob(initialFormData)
    initialFormData = uncompressBinStr(initialFormData)

    const formNames = Object.keys(forms)
    let fieldIndex = 0
    for(let i = 0; i < formNames.length; i++){
      const formName = formNames[i]
      const formPage = $(`.${formName}-page`)
      const formFields = formPage.find(".field")

      formFields.each(function(){
        const name = $(this).find(".field-name").text()
        if(name === "N/A") return

        $(this).find(".field-checkbox").prop("checked", initialFormData[fieldIndex] === "1")

        fieldIndex += 1
      })
    }
  }
}







// Return the form data
function getFinishedForm(){
  let finishedFormData = {}

  const formNames = Object.keys(forms)
  for(let i = 0; i < formNames.length; i++){
    const formName = formNames[i]
    const formPage = $(`.${formName}-page`)
    const formFields = formPage.find(".field")

    finishedFormData[formName] = []

    formFields.each(function(){
      const name = $(this).find(".field-name").text()
      if(name === "N/A") return;

      finishedFormData[formName].push({
        name,
        description: $(this).find(".field-description").text(),
        selected: $(this).find(".field-checkbox").prop("checked")
      })
    })
  }

  return finishedFormData
}

// Return the form data as a binary string of 1s and 0s
function getFinishedFormAsBinStr(){
  const finishedFormData = getFinishedForm()
  let formDataArray = ""

  const formNames = Object.keys(forms)
  for(let i = 0; i < formNames.length; i++){
    const formName = formNames[i]
    const fields = finishedFormData[formName]

    for(let j = 0; j < fields.length; j++){
      const field = fields[j]
      formDataArray += field.selected ? "1" : "0"
    }
  }

  return formDataArray
}

// Load data from data files into memory
async function loadDataFromFiles(){
  let data = await fetch("data/forms.json")
  data = await data.json()
  forms = data.forms

  data = await fetch("data/welcome_text.txt")
  welcomeText = await data.text()
}






// Has the user download a text file
function download(filename, text) {
  let element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

// Create csv text from the form data
function buildCSV(finishedFormData){
  let csv = `"use","field_title","field_description","Where we store","Your Mapping"\n"Elements you selected will appear on the top of this list with a 'yes' next to them, followed by rows of elements you did not choose, indicated by a 'no.'","These are the names of the elements.","These are the descriptions of how these elements can be used and understood.","If you wish, you can use this column to note where you keep this information. This could be a record type, 'Dublin Core record' or it could be the name of a document or database where you store the information, 'MS Access database,' or 'Pre-interview Questionnaire'","If you wish, you can create a mapping here of what record tag or field where you store this element information. For example, '245' in a MARC record or 'Source' in a VRA Core record. You can get as specific as it would be helpful for your team to document."\n`

  const formNames = Object.keys(forms)
  for(let i = 0; i < formNames.length; i++){
    const formName = formNames[i]
    const fields = finishedFormData[formName]
    for(let j = 0; j < fields.length; j++){
      const field = fields[j]
      if(field.name === "N/A") continue

      csv += `"${field.selected ? "YES" : "NO"}","${field.name.trim().replaceAll('"', '""')}","${field.description.trim().replaceAll('"', '""') || "-"}","",""`

      csv += "\n"
    }
  }
  csv = csv.substring(0, csv.length - 1);

  return csv
}

// Create a pdf and has the user download it
function buildAndDownloadPDF(finishedFormData){
  let pdf = `<h1 style="font-size:48px;">Element List for Oral Histories</h1>`

  const formNames = Object.keys(forms)
  for(let i = 0; i < formNames.length; i++){
    const formName = formNames[i]

    pdf += `<br/><br/><br/><br/><h1 style="font-size:32px;">${capFirst(formName)}</h1>`

    const fields = finishedFormData[formName]
    for(let j = 0; j < fields.length; j++){
      const field = fields[j]
      if(field.name === "N/A") continue

      const color = field.selected ? 'color:#000000;' : 'color:#353535;'

      pdf += `<div style="margin-top:30px;font-size:14px;"><h2>${field.name}</h2><div style="font-size:19px;margin-bottom:30px;${color}">${field.selected ? "Yes" : "No"}</div></div>`
    }
  }

  let doc = new jsPDF()
  doc.fromHTML(pdf, 10, 10)
  doc.save("OHMetadataChoices.pdf")
}








// Returns index of a page name in the pages array
function getPageIndexFromName(pageName){
  for(let i = 0; i < pages.length; i++){
    if(pageName.toLowerCase() === pages[i].name) return i
  }
  return -1;
}

// Capitalizes first character in string and returns it
function capFirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

// Sets the active page and updates timeline ui and page
function setActivePage(pageIndex){
  if(pageIndex < 0 || pageIndex > pages.length - 1) return;

  if(pages[pageIndex].locked) return;

  activePageIndex = pageIndex
  updateTimeline()
  updatePage()
}

// Returns a form's data of its fields
function getEmptyFormData(formName){
  return forms[formName.toLowerCase()]
}

// Compresses string of binary 0s and 1s
function compressBinStr(str){
  let data = str
  for(let i = 9; i >= 3; i--){
    let fill = ""
    for(let j = 0; j < i; j++){ fill += "0" }

    const zeros = fill
    const ones = fill.replaceAll("0", "1")
    data = data.replaceAll(zeros, "z" + i).replaceAll(ones, "o" + i)
  }
  return data
}
// Uncompresses string of binary 0s and 1s
function uncompressBinStr(str){
  let data = str
  for(let i = 9; i >= 3; i--){
    let fill = ""
    for(let j = 0; j < i; j++){ fill += "0" }

    const zeros = fill
    const ones = fill.replaceAll("0", "1")
    data = data.replaceAll("z" + i, zeros).replaceAll("o" + i, ones)
  }
  return data
}

// Returns a copy of a template element and appends it to its parent element
function createFromTemplate(templateElement){
  templateElement = templateElement.last()

  if(templateElement.length === 0){
    throw new Error("Attempted to createFromTemplate on non-existing template element.")
  }
  else if(!templateElement.hasClass("template")){
    throw new Error("Attempted to createFromTemplate on a non-template element. Make sure elements passed in have the class 'template'")
  }

  let newElement = templateElement.clone()
  newElement.removeClass("template")

  templateElement.parent().append(newElement)
  return newElement
}

// Creates a reusable link that saves the current form data
function createReusableLink(formDataStr){
  let data = formDataStr
  data = compressBinStr(data)
  const encodedData = window.btoa(data)

  const url = window.location.href.split('?')[0]
  const link = `${url}?data=${encodedData}`

  return link
}