//
//  Server.swift
//  secret-game-client
//
//  Created by timas on 2023-05-27.
//

import Foundation

enum Server: String {
    case local = "http://localhost:3000"
    case remote = "http://mrtims.local:3000"
    
    var url: URL {
        URL(string: self.rawValue)!
    }
}
