import Foundation
import Network

final class Browser {

    let browser: NWBrowser
    @Published var hostPort: (host: String, port: String)?

    init() {
        let parameters = NWParameters()
        parameters.includePeerToPeer = true

        browser = NWBrowser(for: .bonjour(type: "_snakesOnAPlane._tcp", domain: nil), using: parameters)
    }

    func start() {
        browser.browseResultsChangedHandler = { results, changes in
            for result in results {
                guard case NWEndpoint.service = result.endpoint else {
                    return
                }
                
                let connection = NWConnection(to: result.endpoint, using: .tcp)

                connection.stateUpdateHandler = { [weak self] state in
                    switch state {
                    case .ready:
                        if let innerEndpoint = connection.currentPath?.remoteEndpoint,
                           case .hostPort(let host, let port) = innerEndpoint {
                            self?.hostPort = (host.debugDescription, port.debugDescription)
                        }
                    default:
                        break
                    }
                }
                connection.start(queue: .global())
            }
        }
        browser.start(queue: .main)
    }
}
