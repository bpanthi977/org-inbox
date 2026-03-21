import UIKit
import Social
import MobileCoreServices
import Photos
import UniformTypeIdentifiers

/// App Group used to share data between the extension and the main app.
/// Must match the group in both targets' entitlements and the main app's Info.plist.
private let APP_GROUP = "group.org.reactjs.native.example.OrgInbox"

/// URL scheme registered in the main app's Info.plist CFBundleURLSchemes.
/// Must match the protocol string passed to ReceiveSharingIntent.getReceivedFiles().
private let URL_SCHEME = "orginbox"

class ShareViewController: UIViewController {

    // MARK: – Lifecycle

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        handleSharedItems()
    }

    // MARK: – Core logic

    private func handleSharedItems() {
        guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
            completeRequest()
            return
        }

        let group = DispatchGroup()
        var sharedFiles: [[String: Any]] = []
        var sharedTexts: [String] = []
        var sharedURLs: [String] = []

        for item in extensionItems {
            guard let attachments = item.attachments else { continue }
            for provider in attachments {
                // ── URL ──────────────────────────────────────────────────────
                if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL {
                            sharedURLs.append(url.absoluteString)
                        }
                    }
                // ── Plain text ───────────────────────────────────────────────
                } else if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                        defer { group.leave() }
                        if let text = data as? String {
                            sharedTexts.append(text)
                        }
                    }
                // ── Image ────────────────────────────────────────────────────
                } else if provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL {
                            let dest = self.copyToAppGroup(url: url)
                            sharedFiles.append(["path": dest ?? url.absoluteString,
                                                "mimeType": "image/jpeg",
                                                "fileName": url.lastPathComponent,
                                                "type": "image"])
                        } else if let image = data as? UIImage,
                                  let destURL = self.saveImageToAppGroup(image: image) {
                            sharedFiles.append(["path": destURL.absoluteString,
                                                "mimeType": "image/jpeg",
                                                "fileName": destURL.lastPathComponent,
                                                "type": "image"])
                        }
                    }
                // ── Movie / video ────────────────────────────────────────────
                } else if provider.hasItemConformingToTypeIdentifier(UTType.movie.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.movie.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL {
                            let dest = self.copyToAppGroup(url: url)
                            sharedFiles.append(["path": dest ?? url.absoluteString,
                                                "mimeType": "video/mp4",
                                                "fileName": url.lastPathComponent,
                                                "type": "video"])
                        }
                    }
                // ── Generic file / data ──────────────────────────────────────
                } else if provider.hasItemConformingToTypeIdentifier(UTType.data.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.data.identifier) { data, _ in
                        defer { group.leave() }
                        if let url = data as? URL {
                            let dest = self.copyToAppGroup(url: url)
                            sharedFiles.append(["path": dest ?? url.absoluteString,
                                                "mimeType": provider.registeredTypeIdentifiers.first ?? "application/octet-stream",
                                                "fileName": url.lastPathComponent,
                                                "type": "file"])
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            guard let self = self else { return }
            self.persistAndOpen(files: sharedFiles, texts: sharedTexts, urls: sharedURLs)
        }
    }

    // MARK: – Persist to App Group and open main app

    private func persistAndOpen(files: [[String: Any]], texts: [String], urls: [String]) {
        guard let defaults = UserDefaults(suiteName: APP_GROUP) else {
            completeRequest()
            return
        }

        var urlFragment: String
        var key: String

        if !urls.isEmpty {
            // URL share — pass as webUrl fragment so ReceiveSharingIntent reads it directly
            let urlString = urls.joined(separator: ",")
            key = "urlItems"
            defaults.set([urlString], forKey: key)
            urlFragment = "\(URL_SCHEME)://\(urlString)"
        } else if !files.isEmpty {
            key = "mediaItems-\(Date().timeIntervalSince1970)"
            let data = try? JSONSerialization.data(withJSONObject: files)
            defaults.set(data, forKey: key)
            let isMedia = files.first?["type"] as? String == "image" ||
                          files.first?["type"] as? String == "video"
            urlFragment = "\(URL_SCHEME)://dataUrl=\(key)#\(isMedia ? "media" : "file")"
        } else if !texts.isEmpty {
            key = "textItems"
            defaults.set(texts, forKey: key)
            urlFragment = "\(URL_SCHEME)://dataUrl=\(key)#text"
        } else {
            completeRequest()
            return
        }

        defaults.synchronize()

        guard let appURL = URL(string: urlFragment) else {
            completeRequest()
            return
        }

        // Open the main app
        var responder: UIResponder? = self
        while responder != nil {
            if let application = responder as? UIApplication {
                application.open(appURL, options: [:], completionHandler: nil)
                break
            }
            responder = responder?.next
        }

        completeRequest()
    }

    private func completeRequest() {
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }

    // MARK: – File helpers

    /// Copy a file URL into the App Group's tmp directory so the main app can access it.
    private func copyToAppGroup(url: URL) -> String? {
        guard let groupURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: APP_GROUP
        ) else { return nil }

        let destDir = groupURL.appendingPathComponent("tmp", isDirectory: true)
        try? FileManager.default.createDirectory(at: destDir, withIntermediateDirectories: true)
        let dest = destDir.appendingPathComponent(url.lastPathComponent)
        try? FileManager.default.removeItem(at: dest)
        try? FileManager.default.copyItem(at: url, to: dest)
        return dest.absoluteString
    }

    /// Save a UIImage to the App Group tmp directory as JPEG.
    private func saveImageToAppGroup(image: UIImage) -> URL? {
        guard let groupURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: APP_GROUP
        ) else { return nil }

        let destDir = groupURL.appendingPathComponent("tmp", isDirectory: true)
        try? FileManager.default.createDirectory(at: destDir, withIntermediateDirectories: true)
        let fileName = "shared_image_\(Int(Date().timeIntervalSince1970)).jpg"
        let dest = destDir.appendingPathComponent(fileName)
        if let data = image.jpegData(compressionQuality: 0.9) {
            try? data.write(to: dest)
            return dest
        }
        return nil
    }
}
