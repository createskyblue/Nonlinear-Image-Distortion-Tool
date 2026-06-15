# Nonlinear Image Distortion Tool

[中文](./README_CN.md)

A local browser tool for nonlinear image distortion. It turns drawings, screenshots, and reference images into parameter-based nonlinear distorted versions, and can use the same parameter code for approximate restoration, simple privacy masking, and source checks.

![Screenshot](./img/EN.jpg)

## What It Does

- **Scramble images**: apply a deterministic nonlinear distortion with your key, then download the PNG result.
- **Restore with a parameter code**: save the `NO2:` parameter code and use it later to restore with the same settings.
- **Handles proportional scaling**: if the image is resized, the same parameter code can still be used for approximate restoration.
- **Paste-to-process**: paste a screenshot directly into the page and it will process automatically with the current mode.
- **File, camera, and drag-and-drop input**: choose a file, take a photo, or drag an image into the page.
- **Repeated softening**: click “Blur” repeatedly to scramble and restore again, softening details step by step.
- **Copy result automatically**: optionally copy the processed PNG to the clipboard after processing.
- **Remembers settings**: the page saves your latest key and parameters locally.

## Use Cases

- **Draft previews for design work**: share CAD exports, UI mockups, product structure images, or diagrams in a distorted form. Viewers can understand the layout and direction, but the image is harder to reuse directly as production material.
- **Lightweight source tracing**: keep the original image and the parameter code used for each shared copy. If a screenshot or preview later appears elsewhere, the same parameter code can help check whether it came from that distribution path.
- **Reversible visual redaction**: apply a mild distortion to screenshots that contain customer names, internal notes, or other sensitive details. The image remains useful for discussion, while the parameter code keeps a path for approximate restoration.
- **Supporting provenance checks**: when a disputed image is suspected to derive from your original material, restoration with the known parameter code can provide an additional signal. A noticeably better restoration with the correct code is useful context, but it should not be treated as forensic proof by itself.
- **Local-only processing**: images are processed in the browser. They do not need to be uploaded to a remote service.

## Basic Workflow

1. Open the page and choose a file, take a photo, drag an image in, or paste a screenshot.
2. Select Scramble or Restore.
3. Adjust the key, offset strength, grid size, and swirl.
4. Save the parameter code. Paste it later to restore the same settings.
5. Click Process, review the result, then download it.

## Keep the Parameter Code

The parameter code is the key to reproducing the result. If you need to restore the image later or identify a source, keep both:

- the processed image
- the `NO2:` parameter code

The key alone is not enough. Offset strength, grid size, and swirl must also match.

## Why No Watermarking?

This project deliberately does not include visible or invisible watermarking.

Invisible watermarks were tested first, but they were not robust enough for this use case. A watermark that fails after resizing, compression, screenshots, or local interference is not reliable as a tracking signal.

Visible watermarks are also weak here. Even when a visible watermark is distorted by this tool, current AI watermark removal can still erase it with little effort, so it does not provide meaningful protection.

The useful signal turned out to be the nonlinear distortion itself. AI-assisted tools can remove or redraw text and logos, but they cannot reliably recover a keyed nonlinear distortion back to the exact original image. The parameter code therefore acts like a practical tracing key: if the correct key restores the image much better than the wrong key, it gives a way to identify which parameter set was used.

## Run Locally

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 5288
```

Build for production:

```bash
npm run build
```

## Note

Restoration is approximate, not pixel-perfect. Scrambling, resizing, compression, and screenshots all introduce some loss. The goal is that the correct parameter code restores the image noticeably better than a wrong one.
