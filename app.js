document.addEventListener("DOMContentLoaded", () => {
    // --- Elements ---
    const btnVoice = document.getElementById("btnVoice");
    const textArea = document.getElementById("textArea");
    const btnCopy = document.getElementById("btnCopy");
    const btnClear = document.getElementById("btnClear");
    const notification = document.getElementById("notification");

    const helpIcon = document.getElementById("helpIcon");
    const guideDialog = document.getElementById("guideDialog");
    const closeDialog = document.getElementById("closeDialog");

    const btnSelectChar = document.getElementById("btnSelectChar");
    const charDialog = document.getElementById("charDialog");
    const closeCharDialog = document.getElementById("closeCharDialog");
    const keyboardContainer = document.getElementById("keyboard");

    const btnTranslate = document.getElementById("btnTranslate");
    const translateDialog = document.getElementById("translateDialog");
    const closeTranslateDialog = document.getElementById("closeTranslateDialog");
    const translatedText = document.getElementById("translatedText");
    const btnCopyTranslated = document.getElementById("btnCopyTranslated");
    const translateNotification = document.getElementById("translateNotification");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    let recognition = null;
    let isRecording = false;
    let savedTranscript = "";
    let silenceTimeout = null;
    let ignoreResults = false;

    // --- Mapping từ → ký tự ---
    const wordToCharMap = {
        "chấm than": "!",
        "chấm hỏi": "?",
        "chấm": ".",
        "phẩy": ",",
        "xuống dòng": "\n",
        "a còng": "@",
    };

    function replaceWordsWithChars(text) {
        let result = text;
        for (const key in wordToCharMap) {
            const regex = new RegExp(`\\b${key}\\b`, "gi");
            result = result.replace(regex, wordToCharMap[key]);
        }
        return result;
    }

    function capitalizeAfterPunctuation(text) {
        let result = "";
        let capitalizeNext = true;
        for (let i = 0; i < text.length; i++) {
            let char = text[i];
            if (capitalizeNext && /[a-zA-ZÀ-ỹ]/.test(char)) {
                char = char.toUpperCase();
                capitalizeNext = false;
            }
            result += char;
            if ([".", "!", "?", "\n"].includes(char)) capitalizeNext = true;
        }
        return result;
    }

    // --- Speech Recognition ---
    function createRecognition() {
        const rec = new SpeechRecognition();
        rec.lang = "vi-VN";
        rec.continuous = true;
        rec.interimResults = true;

        rec.onresult = (event) => {
            if (ignoreResults) return;

            clearTimeout(silenceTimeout);
            silenceTimeout = setTimeout(() => stopRecording(), 5000);

            let interimText = "";
            let finalText = "";

            for (let i = 0; i < event.results.length; i++) {
                let transcript = event.results[i][0].transcript;
                transcript = replaceWordsWithChars(transcript);
                transcript = transcript
                    .split("\n")
                    .map(line => line.replace(/^\s+/, ""))
                    .join("\n");

                if (event.results[i].isFinal) {
                    transcript = capitalizeAfterPunctuation(transcript);
                    finalText += transcript;
                    if (!transcript.endsWith("\n")) finalText += " ";
                } else {
                    interimText += transcript + " ";
                }
            }

            textArea.value = (savedTranscript + finalText + interimText).trim();
            textArea.scrollTop = textArea.scrollHeight;
            updateButtons();
        };

        rec.onerror = (event) => {
            console.error("Lỗi micro:", event.error);
            stopRecording();
        };

        return rec;
    }

    function startRecording() {
        recognition = createRecognition();
        ignoreResults = false;
        recognition.start();

        isRecording = true;
        btnVoice.classList.add("recording");
        btnVoice.innerText = "🔴 Listening...";

        updateButtons();
        silenceTimeout = setTimeout(() => stopRecording(), 5000);
    }

    function stopRecording() {
        if (!isRecording) return;

        savedTranscript = textArea.value;
        ignoreResults = true;
        recognition.stop();
        isRecording = false;

        btnVoice.classList.remove("recording");
        btnVoice.innerText = "🎤 Start";

        updateButtons();
        clearTimeout(silenceTimeout);
    }

    // --- Update trạng thái nút ---
    function updateButtons() {
        const hasText = textArea.value.trim().length > 0;
        btnCopy.disabled = !hasText || isRecording;
        btnClear.disabled = !hasText || isRecording;
        btnSelectChar.disabled = isRecording;
        btnTranslate.disabled = !hasText || isRecording;
        syncKeyboardState();
    }

    function showNotification(msg, duration = 1500) {
        notification.textContent = msg;
        notification.style.display = "block";
        setTimeout(() => {
            notification.style.display = "none";
        }, duration);
    }

    // --- Buttons chức năng ---
    btnVoice.addEventListener("click", () => {
        if (!isRecording) startRecording();
        else stopRecording();
    });

    btnCopy.addEventListener("click", () => {
        if (!textArea.value.trim()) return;
        navigator.clipboard.writeText(textArea.value).then(() => showNotification("The text has been successfully copied to your clipboard"));
    });

    btnClear.addEventListener("click", () => {
        textArea.value = "";
        savedTranscript = "";
        updateButtons();
        showNotification("All text has been cleared from the textarea successfully!");
    });

    // Ngăn thao tác với textarea khi đang ghi âm
    ["keydown", "paste", "copy", "cut", "selectstart"].forEach(ev => {
        textArea.addEventListener(ev, (e) => { if (isRecording) e.preventDefault(); });
    });

    textArea.addEventListener("input", () => {
        if (!isRecording) savedTranscript = textArea.value;
        updateButtons();
    });

    // --- Dialog Hướng dẫn ---
    helpIcon.addEventListener("click", () => guideDialog.style.display = "block");
    closeDialog.addEventListener("click", () => guideDialog.style.display = "none");

    // --- Dialog Bảng chữ cái ---
    btnSelectChar.addEventListener("click", () => {
        if (isRecording) return; // không mở khi đang ghi âm
        const rect = textArea.getBoundingClientRect();
        charDialog.style.top = rect.bottom + window.scrollY + "px";
        charDialog.style.left = rect.left + window.scrollX + "px";
        charDialog.style.width = rect.width + "px";
        charDialog.style.display = "block";
    });
    closeCharDialog.addEventListener("click", () => charDialog.style.display = "none");

    // ======= Update khi resize màn hình =======
    window.addEventListener("resize", () => {
        if(charDialog.style.display === "block") {
            const rect = textArea.getBoundingClientRect();
            charDialog.style.top = rect.bottom + window.scrollY + "px";
            charDialog.style.left = rect.left + window.scrollX + "px";
            charDialog.style.width = rect.width + "px";
        }
    });

    window.addEventListener("click", (e) => {
        if (e.target === guideDialog) guideDialog.style.display = "none";
        if (e.target === charDialog) charDialog.style.display = "none";
    });

    // ================= Virtual Keyboard =================
    const keyboardLayout = [
        ["q","w","e","r","t","y","u","i","o","p"],
        ["a","s","d","f","g","h","j","k","l"],
        ["Shift","z","x","c","v","b","n","m","⌫"],
        ["Space","Enter","Clear","Copy"]
    ];
    let isShift = false;

    const vietnameseMap = {
        "a":["á","à","ả","ã","ạ","ă","ắ","ằ","ẳ","ẵ","ặ","â","ấ","ầ","ẩ","ẫ","ậ"],
        "e":["é","è","ẻ","ẽ","ẹ","ê","ế","ề","ể","ễ","ệ"],
        "d":["đ"],
        "i":["í","ì","ỉ","ĩ","ị"],
        "o":["ó","ò","ỏ","õ","ọ","ô","ố","ồ","ổ","ỗ","ộ","ơ","ớ","ờ","ở","ỡ","ợ"],
        "u":["ú","ù","ủ","ũ","ụ","ư","ứ","ừ","ử","ữ","ự"],
        "y":["ý","ỳ","ỷ","ỹ","ỵ"],
        "A":["Á","À","Ả","Ã","Ạ","Ă","Ắ","Ằ","Ẳ","Ẵ","Ặ","Â","Ấ","Ầ","Ẩ","Ẫ","Ậ"],
        "E":["É","È","Ẻ","Ẽ","Ẹ","Ê","Ế","Ề","Ể","Ễ","Ệ"],
        "D":["Đ"],
        "I":["Í","Ì","Ỉ","Ĩ","Ị"],
        "O":["Ó","Ò","Ỏ","Õ","Ọ","Ô","Ố","Ồ","Ổ","Ỗ","Ộ","Ơ","Ớ","Ờ","Ở","Ỡ","Ợ"],
        "U":["Ú","Ù","Ủ","Ũ","Ụ","Ư","Ứ","Ừ","Ử","Ữ","Ự"],
        "Y":["Ý","Ỳ","Ỷ","Ỹ","Ỵ"]
    };

    const tooltip = document.createElement("div");
    tooltip.classList.add("char-tooltip");
    document.body.appendChild(tooltip);

    function renderKeyboard(container){
        if(!container) return;
        container.innerHTML = "";

        keyboardLayout.forEach(row => {
            const rowDiv = document.createElement("div");
            rowDiv.classList.add("keyboard-row");

            row.forEach(key => {
                const btn = document.createElement("button");
                btn.textContent = key.length === 1 ? (isShift ? key.toUpperCase() : key) : key;
                btn.classList.add("key");
                btn.dataset.key = key;
                if (key === "Clear") {
                    btn.classList.add("clear-key");
                     btn.disabled = btnClear.disabled;
                }
                if (key === "Enter") {
                    btn.disabled = false;
                }

                if (key === "⌫") {
                    btn.disabled = btnClear.disabled;
                }
                if (key === "Copy") {
                    btn.disabled = btnCopy.disabled;
                }
              
                if (["t","r","a","m","T","R","A","M"].includes(key)) {
                    btn.classList.add("highlight-key");
                }

                btn.addEventListener("click", () => {
                    if (isRecording) return;

                    if (key === "Shift") {
                        isShift = !isShift;
                        container.classList.toggle("shift", isShift);
                    }
                    else if (key === "⌫") {
                        textArea.value = textArea.value.slice(0,-1);
                    } 
                    else if (key === "Enter") textArea.value += "\n";
                    else if (key === "Space") textArea.value += " ";
                    else if(key === "Clear") {   // xử lý nút Clear
                        textArea.value = "";
                        savedTranscript = "";
                        updateButtons();
                        showNotification("All text has been cleared from the textarea successfully!");
                    }
                    else if (key === "Copy") {
                        if (!textArea.value.trim()) return;
                        navigator.clipboard.writeText(textArea.value).then(() => {
                            showNotification("The text has been successfully copied to your clipboard");
                        });
                    }
                    else textArea.value += btn.textContent;

                    savedTranscript = textArea.value;
                    updateButtons();
                    renderKeyboard(container);
                });

                const variants = vietnameseMap[key];
                if (variants) {
                    btn.addEventListener("mouseenter", () => showTooltip(btn, variants));
                    btn.addEventListener("mouseleave", hideTooltip);
                }

                rowDiv.appendChild(btn);
            });

            container.appendChild(rowDiv);
        });

        container.classList.toggle("shift", isShift);
        tooltip.classList.toggle("shift", isShift);
    }

    renderKeyboard(keyboardContainer);

    let tooltipTimeout;

    function showTooltip(btn, variants){
        if (!btn || !tooltip) return;

        tooltip.innerHTML = "";
        variants.forEach(v => {
            const vBtn = document.createElement("button");
            vBtn.textContent = isShift && v.length === 1 ? v.toUpperCase() : v;
            vBtn.className = isShift ? "tooltip-key shift" : "tooltip-key";
            vBtn.addEventListener("click", () => {
                textArea.value += vBtn.textContent;
                savedTranscript = textArea.value;
                hideTooltip();
                updateButtons();
            });
            tooltip.appendChild(vBtn);
        });

        const rect = btn.getBoundingClientRect();
        tooltip.style.top = rect.bottom + window.scrollY + "px";
        tooltip.style.left = rect.left + window.scrollX + "px";
        tooltip.style.visibility = "visible";
        tooltip.style.opacity = "1";

        clearTimeout(tooltipTimeout);
    }

    function hideTooltip(){
        tooltipTimeout = setTimeout(() => {
            tooltip.style.visibility = "hidden";
            tooltip.style.opacity = "0";
        }, 200); // delay 200ms để người dùng kịp di chuột
    }

    // Giữ tooltip khi di chuột vào tooltip
    tooltip.addEventListener("mouseenter", () => clearTimeout(tooltipTimeout));
    tooltip.addEventListener("mouseleave", hideTooltip);

    // translate
    // --- Translate Toggle ---
    translatedText.dataset.lang = "vi"; // mặc định nội dung tiếng Việt
    textArea.addEventListener("input", () => {
        btnTranslate.disabled = !textArea.value.trim() || isRecording;
    });

    async function translateText(source, targetLang) {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(source)}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Network error");
            const data = await res.json();
            return data[0].map(item => item[0]).join("");
        } catch (err) {
            console.error("Translate error:", err);
            throw err;
        }
    }

    // Nút Translate toggle Việt ↔ Anh
    btnTranslate.addEventListener("click", async () => {
        const sourceText = textArea.value.trim();
        if (!sourceText) return;

        try {
            // Chỉ gọi 1 API
            // tl=vi nếu muốn dịch sang tiếng Việt, Google sẽ tự nhận dạng ngôn ngữ nguồn
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=auto&dt=t&q=${encodeURIComponent(sourceText)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Network error");
            const data = await res.json();

            // data[2] là ngôn ngữ nguồn
            const sourceLang = data[2];
            // Nếu nguồn là tiếng Việt -> dịch sang Anh, ngược lại dịch sang Việt
            const targetLang = sourceLang === "vi" ? "en" : "vi";

            // Tạo kết quả dịch từ phần tử trả về
            const translated = data[0].map(part => part[0]).join("");

            // Nếu ngôn ngữ nguồn là targetLang rồi, gọi lại API với tl=targetLang để dịch
            if (sourceLang !== targetLang) {
                const finalUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(sourceText)}`;
                const res2 = await fetch(finalUrl);
                const data2 = await res2.json();
                translatedText.value = data2[0].map(p => p[0]).join("");
            } else {
                translatedText.value = translated;
            }

            translatedText.dataset.lang = targetLang;
            translateDialog.style.display = "block";
        } catch (err) {
            console.error("Translate error:", err);
            alert("Translation failed. Please try again.");
        }
    });


    // Đóng dialog
    closeTranslateDialog.addEventListener("click", () => translateDialog.style.display = "none");
    window.addEventListener("click", (e) => {
        if (e.target === translateDialog) translateDialog.style.display = "none";
    });

    // Copy translated text
    btnCopyTranslated.addEventListener("click", () => {
        if (!translatedText.value) return;
        navigator.clipboard.writeText(translatedText.value).then(() => {
            translateNotification.textContent = "The translated text has been successfully copied to your clipboard!";
            translateNotification.style.display = "block";
            setTimeout(() => translateNotification.style.display = "none", 2000);
        });
    });

    function syncKeyboardState() {
        const hasText = textArea.value.trim().length > 0;

        const keys = keyboardContainer.querySelectorAll(".key");
        keys.forEach(key => {
            const k = key.dataset.key;

            if (k === "Clear") key.disabled = !hasText || isRecording;
            if (k === "Copy") key.disabled = !hasText || isRecording;

            if (k === "⌫") key.disabled = !hasText || isRecording;
        });
    }

});
