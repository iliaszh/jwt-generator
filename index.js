"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const submitDataButton = document.querySelector("#submit-data");
const validationErrors = document.querySelector(".validation-errors");
const inputs = document.querySelectorAll("input");
submitDataButton.addEventListener("click", onFormSubmit);
inputs.forEach((input) => {
    input.addEventListener("invalid", onValidationError);
});
function onFormSubmit(_event) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const valid = validateInputs();
        if (!valid) {
            console.log("validity check failed");
            return;
        }
        console.log("validity check passed");
        const iat = document.getElementById("iat");
        if (!(iat instanceof HTMLInputElement)) {
            console.error("expected #iat to be an HTMLInputElement");
            return;
        }
        const issuedAt = iat.valueAsDate;
        if (issuedAt === null) {
            console.error("expected iat to not be null");
            return;
        }
        const jti = document.getElementById("jti");
        if (!(jti instanceof HTMLInputElement)) {
            console.error("expected #jti to be an HTMLInputElement");
            return;
        }
        const tokenID = jti.value;
        const isOk = document.querySelector('input[name=isOk]:checked');
        if (!(isOk instanceof HTMLInputElement)) {
            console.error("expected isOk to be an HTMLInputElement");
            return;
        }
        const ok = isOk.value == "true";
        const bestshot = document.getElementById("bestshot");
        if (!(bestshot instanceof HTMLInputElement)) {
            console.error("expected #bestshot to be an HTMLInputElement");
            return;
        }
        const secret = document.getElementById("secret");
        if (!(secret instanceof HTMLInputElement)) {
            console.error("expected #secret to be an HTMLInputElement");
            return;
        }
        const secretStr = secret.value;
        const photo = (_a = bestshot.files) === null || _a === void 0 ? void 0 : _a.item(0);
        if (!photo) {
            console.error("expected bestshot photo to not be falsey");
            return;
        }
        let base64EncPhoto;
        try {
            base64EncPhoto = yield encodeBlobWithBase64(photo, null);
        }
        catch (ex) {
            console.error(`encoding file with base64: ${ex}`);
            return;
        }
        let header = {
            alg: "HS256",
            typ: "JWT"
        };
        let encodedHeader;
        try {
            encodedHeader = yield encodeBlobWithBase64(new Blob([JSON.stringify(header)]), "url");
        }
        catch (ex) {
            console.error(`encoding JWT header with base64url: ${ex}`);
            return;
        }
        let payload = {
            iat: Math.floor((issuedAt.getTime() + issuedAt.getTimezoneOffset() * 60 * 1000)
                / 1000),
            jti: tokenID,
            isOk: ok,
            bestshot: base64EncPhoto,
        };
        let encodedPayload;
        try {
            encodedPayload = yield encodeBlobWithBase64(new Blob([JSON.stringify(payload)]), "url");
        }
        catch (ex) {
            console.error(`encoding JWT payload with base64url: ${ex}`);
            return;
        }
        const encoder = new TextEncoder();
        const key = yield window.crypto.subtle.importKey("raw", encoder.encode(secretStr), {
            name: "HMAC",
            hash: {
                name: "SHA-256"
            },
        }, true /* extractable */, ["sign"] /* usages */);
        const signature = yield crypto.subtle.sign("HMAC", key, encoder.encode(encodedHeader + "." + encodedPayload));
        let encodedSignature;
        try {
            encodedSignature = yield encodeBlobWithBase64(new Blob([signature]), "url");
        }
        catch (ex) {
            console.error(`encoding JWT payload with base64url: ${ex}`);
            return;
        }
        console.log("generated jwt");
        const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
        const div = document.querySelector(".generated-token");
        if (!(div instanceof HTMLDivElement)) {
            console.error("expected element with class generated-token to be a div");
            return;
        }
        const prevElems = div.querySelectorAll(".jwt,.copy-jwt");
        prevElems.forEach((value) => {
            const parent = value.parentElement;
            parent === null || parent === void 0 ? void 0 : parent.removeChild(value);
        });
        let copyButton = document.createElement("button");
        copyButton.title = "Скопировать";
        copyButton.type = "button";
        copyButton.className = "copy-jwt";
        copyButton.textContent = `Скопировать`;
        copyButton.addEventListener("click", onCopyJWT);
        let code = document.createElement("code");
        code.appendChild(document.createTextNode(jwt));
        code.className = "jwt";
        div.appendChild(copyButton);
        div.appendChild(code);
    });
}
function onCopyJWT(_) {
    return __awaiter(this, void 0, void 0, function* () {
        const parent = this.parentElement;
        if (!parent) {
            console.error("copy button should have a parent element");
            return;
        }
        const jwt = parent.querySelector(".jwt");
        if (!jwt) {
            console.error("div should have a child with class 'jwt'");
            return;
        }
        const token = jwt.textContent;
        if (!token) {
            console.error("element with class 'jwt' should have text");
            return;
        }
        try {
            yield navigator.clipboard.writeText(token);
        }
        catch (ex) {
            console.error(`cannot copy to clipboard: ${ex}`);
            return;
        }
        console.log("token copied!");
    });
}
function encodeBlobWithBase64(blob, enc) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield new Promise((resolve, reject) => {
            const reader = Object.assign(new FileReader(), {
                onload: () => resolve(reader.result),
                onerror: () => reject(reader.error),
            });
            reader.readAsDataURL(blob);
        });
        if (typeof result !== "string") {
            throw "expected result to be a string";
        }
        let std = result.replace(/data:.*,/, "");
        if (!enc) {
            return std;
        }
        switch (enc) {
            case "url":
                return std
                    .replace(/\+/g, "-")
                    .replace(/\//g, "_")
                    .replace(/=/g, "");
        }
    });
}
function validateInputs() {
    // remove all validation errors
    const validationErrors = document.getElementsByClassName("validation-error");
    for (var i = validationErrors.length - 1; i >= 0; i--) {
        let err = validationErrors[i];
        const parent = err.parentElement;
        parent === null || parent === void 0 ? void 0 : parent.removeChild(err);
    }
    // validate all inputs
    let valid = true;
    inputs.forEach((input) => {
        // beware of lazy evaluation
        valid = input.checkValidity() && valid;
    });
    return valid;
}
function onValidationError(event) {
    var _a;
    console.log("validation error event handler called");
    let target = event.target;
    if (!(target instanceof HTMLInputElement)) {
        console.log("expected event target to be an HTMLInputElement");
        return;
    }
    let err = document.createElement("span");
    let text = document.createTextNode(target.validationMessage);
    err.classList.add("validation-error");
    err.appendChild(text);
    (_a = target === null || target === void 0 ? void 0 : target.parentElement) === null || _a === void 0 ? void 0 : _a.appendChild(err);
}
