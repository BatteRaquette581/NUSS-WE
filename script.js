const canvas = document.querySelector("canvas")
const header = document.getElementById("header")
const main_menu_button = document.getElementById("main-menu")
main_menu_button.style.display = "none"
const play_button = document.getElementById("play")
const about_button = document.getElementById("about")
const changelog_button = document.getElementById("changelog")
const tutorial_button = document.getElementById("tutorial")
const page_content_button = document.getElementById("page-content")
page_content_button.style.display = "none"
let start
let playing = false
let interval_id = null
let sandbox = new GlslCanvas(canvas)

function refresh() {
    canvas.width = document.body.clientWidth
    canvas.height = document.body.clientHeight
    fetch("shader.frag").then(response => response.text()).then(text => sandbox.load(text))
}
window.addEventListener("resize", refresh)
refresh()

function toggle_off_menu() {
    main_menu_button.style.display = "inline"
    play_button.style.display = "none"
    about_button.style.display = "none"
    changelog_button.style.display = "none"
    tutorial_button.style.display = "none"
}

main_menu_button.onclick = () => {
    main_menu_button.style.display = "none"
    play_button.style.display = "inline"
    about_button.style.display = "inline"
    changelog_button.style.display = "inline"
    tutorial_button.style.display = "inline"
    page_content_button.style.display = "none"
    playing = false
    header.innerText = "NUSS:WE"
    if (interval_id !== null) {
        window.clearInterval(interval_id)
        interval_id = null
    }
}

play_button.onclick = () => {
    header.innerText = "You have kept this tab open for: 0 seconds."
    toggle_off_menu()
    playing = true
    start = Date.now()
    interval_id = window.setInterval(count, 1000)
}

tutorial_button.onclick = () => {
    toggle_off_menu()
    header.innerText = "Tutorial"
    page_content_button.innerText = "Sleep."
    page_content_button.style.display = "inline"
}

about_button.onclick = () => {
    toggle_off_menu()
    header.innerText = "About"
    page_content_button.innerText = "The goal of the game is to sleep the longest you can. You can then share your highscore with your friends."
    page_content_button.style.display = "inline"
}

changelog_button.onclick = () => {
    toggle_off_menu()
    header.innerText = "Changelog"
    page_content_button.innerText = "Changelog:\nv1.1\nAdded about menu\nAdded changelog"
    page_content_button.style.display = "inline"
}

function count() {
    if (playing)
        header.innerText = "You have kept this tab open for: " + Math.round((Date.now() - start) / 1000) + " seconds."
}
