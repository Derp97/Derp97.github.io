function loadAsyncImage({ imageId, imageUrl, loaderText = "Loading image..." }) {
    const image = document.getElementById(imageId);

    if (!image) return;

    const frame = image.closest(".async-image-frame");
    const loaderTextElement = frame?.querySelector(".async-image-loader p");

    if (loaderTextElement) {
        loaderTextElement.textContent = loaderText;
    }

    image.onload = () => {
        image.classList.add("is-loaded");

        if (frame) {
            frame.classList.add("is-loaded");
        }
    };

    image.onerror = () => {
        if (loaderTextElement) {
            loaderTextElement.textContent = "Image failed to load.";
        }
    };

    image.src = imageUrl;
}