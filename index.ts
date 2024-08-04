const submitDataButton = document.querySelector("#submit-data")!

const validationErrors = document.querySelector(".validation-errors")

const inputs = document.querySelectorAll("input")

submitDataButton.addEventListener("click", onFormSubmit)

inputs.forEach((input: HTMLInputElement) => {
	input.addEventListener("invalid", onValidationError)
})

async function onFormSubmit(_event: Event) {
	const valid = validateInputs()
	if (!valid) {
		console.log("validity check failed")
		return
	}

	console.log("validity check passed")

	const iat = document.getElementById("iat")
	if (!(iat instanceof HTMLInputElement)) {
		console.error("expected #iat to be an HTMLInputElement")
		return
	}

	const issuedAt = iat.valueAsDate
	if (issuedAt === null) {
		console.error("expected iat to not be null")
		return
	}

	const jti = document.getElementById("jti")
	if (!(jti instanceof HTMLInputElement)) {
		console.error("expected #jti to be an HTMLInputElement")
		return
	}

	const tokenID = jti.value

	const isOk = document.querySelector('input[name=isOk]:checked')

	if (!(isOk instanceof HTMLInputElement)) {
		console.error("expected isOk to be an HTMLInputElement")
		return
	}

	const ok = isOk.value == "true"

	const bestshot = document.getElementById("bestshot")
	if (!(bestshot instanceof HTMLInputElement)) {
		console.error("expected #bestshot to be an HTMLInputElement")
		return
	}

	const secret = document.getElementById("secret")
	if (!(secret instanceof HTMLInputElement)) {
		console.error("expected #secret to be an HTMLInputElement")
		return
	}

	const secretStr = secret.value

	const photo = bestshot.files?.item(0)
	if (!photo) {
		console.error("expected bestshot photo to not be falsey")
		return
	}

	let base64EncPhoto: string
	try {
		base64EncPhoto = await encodeBlobWithBase64(photo, null)
	} catch (ex) {
		console.error(`encoding file with base64: ${ex}`)
		return
	}

	let header: Header = {
		alg: "HS256",
		typ: "JWT"
	}

	let encodedHeader: string
	try {
		encodedHeader = await encodeBlobWithBase64(
			new Blob([JSON.stringify(header)]), "url"
		)
	} catch (ex) {
		console.error(`encoding JWT header with base64url: ${ex}`)
		return
	}

	let payload: Payload = {
		iat: Math.floor(
			(issuedAt.getTime() + issuedAt.getTimezoneOffset() * 60 * 1000)
			/ 1000
		),
		jti: tokenID,
		isOk: ok,
		bestshot: base64EncPhoto,
	}

	let encodedPayload: string
	try {
		encodedPayload = await encodeBlobWithBase64(
			new Blob([JSON.stringify(payload)]), "url"
		)
	} catch (ex) {
		console.error(`encoding JWT payload with base64url: ${ex}`)
		return
	}

	const encoder = new TextEncoder()

	const key = await window.crypto.subtle.importKey(
		"raw",
		encoder.encode(secretStr),
		{
			name: "HMAC",
			hash: {
				name: "SHA-256"
			},
		},
		true /* extractable */,
		["sign"] /* usages */,
	)

	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(encodedHeader + "." + encodedPayload)
	)

	let encodedSignature: string
	try {
		encodedSignature = await encodeBlobWithBase64(
			new Blob([signature]), "url"
		)
	} catch (ex) {
		console.error(`encoding JWT payload with base64url: ${ex}`)
		return
	}

	console.log("generated jwt")
	const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`

	const div = document.querySelector(".generated-token")
	if (!(div instanceof HTMLDivElement)) {
		console.error("expected element with class generated-token to be a div")
		return
	}

	const prevElems = div.querySelectorAll(".jwt,.copy-jwt")
	prevElems.forEach((value: Element) => {
		const parent = value.parentElement
		parent?.removeChild(value)
	})

	let copyButton = document.createElement("button")
	copyButton.title = "Скопировать"
	copyButton.type = "button"
	copyButton.className = "copy-jwt"
	copyButton.textContent = `Скопировать`

	copyButton.addEventListener("click", onCopyJWT)

	let code = document.createElement("code")
	code.appendChild(document.createTextNode(jwt))
	code.className = "jwt"

	div.appendChild(copyButton)
	div.appendChild(code)
}

async function onCopyJWT(this: HTMLButtonElement, _: MouseEvent) {
	const parent = this.parentElement
	if (!parent) {
		console.error("copy button should have a parent element")
		return
	}

	const jwt = parent.querySelector(".jwt")
	if (!jwt) {
		console.error("div should have a child with class 'jwt'")
		return
	}

	const token = jwt.textContent
	if (!token) {
		console.error("element with class 'jwt' should have text")
		return
	}

	try {
		await navigator.clipboard.writeText(token)
	} catch (ex) {
		console.error(`cannot copy to clipboard: ${ex}`)
		return
	}

	console.log("token copied!")
}

type Header = {
	alg: "HS256"
	typ: "JWT"
}

type Payload = {
	iat: number
	jti: string
	isOk: boolean
	bestshot: string
}

async function encodeBlobWithBase64(
	blob: Blob,
	enc: "url" | null
): Promise<string> {
	const result: string | ArrayBuffer | null = await new Promise(
		(resolve, reject) => {
			const reader = Object.assign(new FileReader(), {
				onload: () => resolve(reader.result),
				onerror: () => reject(reader.error),
			});
			reader.readAsDataURL(blob);
		}
	);

	if (typeof result !== "string") {
		throw "expected result to be a string"
	}

	let std = result.replace(/data:.*,/, "")
	if (!enc) {
		return std
	}

	switch (enc) {
		case "url":
			return std
				.replace(/\+/g, "-")
				.replace(/\//g, "_")
				.replace(/=/g, "")
	}
}

function validateInputs(): boolean {
	// remove all validation errors
	const validationErrors = document.getElementsByClassName(
		"validation-error"
	)
	for (var i = validationErrors.length - 1; i >= 0; i--) {
		let err = validationErrors[i]
		const parent = err.parentElement

		parent?.removeChild(err)
	}

	// validate all inputs
	let valid = true
	inputs.forEach((input: HTMLInputElement) => {
		// beware of lazy evaluation
		valid = input.checkValidity() && valid
	})

	return valid
}

function onValidationError(event: Event) {
	console.log("validation error event handler called")

	let target = event.target
	if (!(target instanceof HTMLInputElement)) {
		console.log("expected event target to be an HTMLInputElement")
		return
	}

	let err = document.createElement("span")
	let text = document.createTextNode(target.validationMessage)
	err.classList.add("validation-error")
	err.appendChild(text)

	target?.parentElement?.appendChild(err)
}