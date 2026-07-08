import AuthenticationServices
import Foundation
import Observation
import StoreKit
import Supabase
import SwiftUI
import UIKit

@main
struct MedLabApp: App {
    @State private var apiClient = MedLabAPIClient()
    @State private var auth = AuthSession()
    @State private var entitlements = EntitlementStore()
    @State private var stats = StudentStatsStore()
    @State private var practice = PracticeSessionStore()
    @State private var store = StoreKitSubscriptionStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(apiClient)
                .environment(auth)
                .environment(entitlements)
                .environment(stats)
                .environment(practice)
                .environment(store)
                .task {
                    await MainActor.run {
                        auth.configure(apiClient: apiClient)
                        entitlements.configure(apiClient: apiClient)
                        stats.configure(apiClient: apiClient)
                        store.configure(apiClient: apiClient)
                    }
                    await auth.restoreSession()
                    if await MainActor.run(body: { auth.isAuthenticated }) {
                        await entitlements.refresh()
                        await stats.refresh()
                        await store.refreshEntitlements()
                    }
                }
        }
    }
}

struct RootView: View {
    @Environment(AuthSession.self) private var auth

    var body: some View {
        Group {
            if auth.isAuthenticated {
                StudentAppView()
            } else {
                AuthView()
            }
        }
        .font(.instrument(size: 15, relativeTo: .body))
        .animation(.easeInOut(duration: 0.2), value: auth.isAuthenticated)
    }
}

// MARK: - Models

struct AppUser: Codable, Equatable, Identifiable {
    let id: String
    let email: String
    var name: String
    var avatarUrl: String?
    var primaryRole: String?
    var createdAt: String?
}

struct SessionResponse: Codable {
    let user: AppUser
    let role: String
    let memberships: [Membership]
    let destination: String?
}

struct Membership: Codable, Hashable {
    let role: String?
    let status: String?
    let institutionId: String?

    enum CodingKeys: String, CodingKey {
        case role
        case status
        case institutionId = "institution_id"
    }
}

struct StudentStats: Codable, Equatable {
    var totalXP: Int = 0
    var currentLevel: Int = 1
    var currentStreak: Int = 0
    var longestStreak: Int = 0
    var ecgMastery: Int = 0
    var casesCompleted: Int = 0
    var simulationsCompleted: Int = 0
    var lastActivityDate: String?
}

struct EntitlementsResponse: Codable {
    var plan: String
    var status: String
    var limits: Limits
    var usage: [String: Int]
    var entitlements: [String: Bool]

    struct Limits: Codable {
        var practiceDaily: Int
        var aiDaily: Int
    }
}

struct EmptyResponse: Codable {}

struct ProfileUpdateResponse: Codable {
    let profile: MobileProfile
}

struct MobileProfile: Codable {
    let id: String?
    let email: String?
    let fullName: String?
    let avatarUrl: String?

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case fullName = "full_name"
        case avatarUrl = "avatar_url"
    }
}

struct AIValidationResponse: Codable {
    let isCorrect: Bool
    let feedback: String
    let explanation: String?
}

struct XPResponse: Codable {
    let xpAwarded: Int
    let reason: String?
    let newLevel: Int?
    let currentStreak: Int?
}

struct XRayGenerateResponse: Codable {
    let images: [GeneratedImage]

    struct GeneratedImage: Codable, Identifiable {
        var id: String { url }
        let url: String
        let width: Int?
        let height: Int?
    }
}

enum MedLabError: LocalizedError {
    case missingConfiguration(String)
    case invalidResponse
    case server(String)

    var errorDescription: String? {
        switch self {
        case .missingConfiguration(let value): return "Missing configuration: \(value)"
        case .invalidResponse: return "Invalid server response."
        case .server(let message): return message
        }
    }
}

// MARK: - Services

@Observable
final class MedLabAPIClient {
    var accessToken: String?

    let baseURL: URL
    let supabaseURL: URL?
    let supabaseAnonKey: String?
    let supabase: SupabaseClient?

    init() {
        let info = Bundle.main.infoDictionary ?? [:]
        let apiBase = info["MEDLAB_API_BASE_URL"] as? String
        let supabaseURLString = info["MEDLAB_SUPABASE_URL"] as? String
        let supabaseKey = info["MEDLAB_SUPABASE_ANON_KEY"] as? String

        baseURL = URL(string: apiBase?.isEmpty == false ? apiBase! : "http://localhost:3015")!
        if let supabaseURLString, !supabaseURLString.isEmpty, let url = URL(string: supabaseURLString) {
            supabaseURL = url
            supabaseAnonKey = supabaseKey?.isEmpty == false ? supabaseKey : nil
            if let key = supabaseAnonKey {
                supabase = SupabaseClient(supabaseURL: url, supabaseKey: key)
            } else {
                supabase = nil
            }
        } else {
            supabaseURL = nil
            supabaseAnonKey = nil
            supabase = nil
        }
    }

    func get<T: Decodable>(_ path: String) async throws -> T {
        try await request(path, method: "GET", body: Optional<Data>.none)
    }

    func post<T: Decodable>(_ path: String, json: [String: Any]) async throws -> T {
        let data = try JSONSerialization.data(withJSONObject: json)
        return try await request(path, method: "POST", body: data)
    }

    func patch<T: Decodable>(_ path: String, json: [String: Any]) async throws -> T {
        let data = try JSONSerialization.data(withJSONObject: json)
        return try await request(path, method: "PATCH", body: data)
    }

    func delete<T: Decodable>(_ path: String) async throws -> T {
        try await request(path, method: "DELETE", body: Optional<Data>.none)
    }

    private func request<T: Decodable>(_ path: String, method: String, body: Data?) async throws -> T {
        let url = URL(string: path, relativeTo: baseURL)!.absoluteURL
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        if let accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw MedLabError.invalidResponse }
        if !(200..<300).contains(http.statusCode) {
            let server = try? JSONDecoder().decode(ServerError.self, from: data)
            throw MedLabError.server(server?.error ?? "Request failed with status \(http.statusCode).")
        }
        if T.self == EmptyResponse.self, data.isEmpty {
            return EmptyResponse() as! T
        }
        return try JSONDecoder.medlab.decode(T.self, from: data)
    }

    func signInWithPassword(email: String, password: String) async throws -> String {
        guard let supabaseURL, let supabaseAnonKey else {
            throw MedLabError.missingConfiguration("MEDLAB_SUPABASE_URL and MEDLAB_SUPABASE_ANON_KEY")
        }

        let url = supabaseURL.appending(path: "/auth/v1/token")
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "grant_type", value: "password")]

        var request = URLRequest(url: components.url!)
        request.httpMethod = "POST"
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["email": email, "password": password])

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let server = try? JSONDecoder().decode(ServerError.self, from: data)
            throw MedLabError.server(server?.error ?? "Sign in failed.")
        }

        let auth = try JSONDecoder.medlab.decode(SupabasePasswordResponse.self, from: data)
        return auth.accessToken
    }
}

struct ServerError: Codable {
    let error: String?
    let msg: String?
}

struct SupabasePasswordResponse: Codable {
    let accessToken: String

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
    }
}

extension JSONDecoder {
    static var medlab: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .useDefaultKeys
        return decoder
    }
}

@MainActor
@Observable
final class AuthSession {
    private var apiClient: MedLabAPIClient?
    var currentUser: AppUser?
    var isLoading = false
    var errorMessage: String?

    var isAuthenticated: Bool { currentUser != nil }

    func configure(apiClient: MedLabAPIClient) {
        self.apiClient = apiClient
        apiClient.accessToken = UserDefaults.standard.string(forKey: "medlab.accessToken")
    }

    func restoreSession() async {
        guard let apiClient, apiClient.accessToken != nil else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            let response: SessionResponse = try await apiClient.get("/api/mobile/session")
            currentUser = response.user
        } catch {
            signOut()
        }
    }

    func signIn(email: String, password: String) async {
        guard let apiClient else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let token = try await apiClient.signInWithPassword(email: email, password: password)
            apiClient.accessToken = token
            UserDefaults.standard.set(token, forKey: "medlab.accessToken")
            let response: SessionResponse = try await apiClient.get("/api/mobile/session")
            currentUser = response.user
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func signUp(name: String, email: String, password: String) async {
        guard let apiClient else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let _: EmptyResponse = try await apiClient.post("/api/mobile/auth/signup", json: [
                "name": name,
                "email": email,
                "password": password,
            ])
            await signIn(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteAccount() async {
        guard let apiClient else { return }
        do {
            let _: EmptyResponse = try await apiClient.delete("/api/mobile/auth/delete")
            signOut()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func signOut() {
        currentUser = nil
        apiClient?.accessToken = nil
        UserDefaults.standard.removeObject(forKey: "medlab.accessToken")
    }
}

@MainActor
@Observable
final class EntitlementStore {
    private var apiClient: MedLabAPIClient?
    var response = EntitlementsResponse(
        plan: "free",
        status: "inactive",
        limits: .init(practiceDaily: 3, aiDaily: 25),
        usage: [:],
        entitlements: ["progress.basic": true]
    )
    var isLoading = false

    func configure(apiClient: MedLabAPIClient) {
        self.apiClient = apiClient
    }

    func refresh() async {
        guard let apiClient else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            response = try await apiClient.get("/api/mobile/entitlements")
        } catch {
            response.entitlements["progress.basic"] = true
        }
    }

    func has(_ entitlement: String) -> Bool {
        response.entitlements[entitlement] == true
    }
}

@MainActor
@Observable
final class StudentStatsStore {
    private var apiClient: MedLabAPIClient?
    var stats = StudentStats()
    var isLoading = false

    func configure(apiClient: MedLabAPIClient) {
        self.apiClient = apiClient
    }

    func refresh() async {
        guard let apiClient else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            stats = try await apiClient.get("/api/mobile/stats")
        } catch {
            stats = StudentStats()
        }
    }
}

@MainActor
@Observable
final class PracticeSessionStore {
    var activeSession: PracticeRoute?
}

enum PracticeRoute: Hashable, Identifiable {
    case ecgSimulation
    case ecgCase
    case xraySimulation
    case xrayCase
    case ctSimulation
    case ctCase

    var id: String { String(describing: self) }
}

@MainActor
@Observable
final class StoreKitSubscriptionStore {
    static let productIDs = [
        "com.medlabinteractive.medlab.pro.monthly",
        "com.medlabinteractive.medlab.pro.yearly",
    ]

    private var apiClient: MedLabAPIClient?
    var products: [StoreKit.Product] = []
    var isPurchasing = false
    var errorMessage: String?

    func configure(apiClient: MedLabAPIClient) {
        self.apiClient = apiClient
    }

    func loadProducts() async {
        do {
            products = try await StoreKit.Product.products(for: Self.productIDs)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func refreshEntitlements() async {
        for await result in StoreKit.Transaction.currentEntitlements {
            if case .verified(let transaction) = result,
               Self.productIDs.contains(transaction.productID) {
                await sync(transaction)
            }
        }
    }

    func purchase(_ product: StoreKit.Product) async {
        isPurchasing = true
        defer { isPurchasing = false }
        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                guard case .verified(let transaction) = verification else {
                    throw MedLabError.server("The App Store transaction could not be verified.")
                }
                await sync(transaction)
                await transaction.finish()
            case .userCancelled, .pending:
                break
            @unknown default:
                break
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func sync(_ transaction: StoreKit.Transaction) async {
        guard let apiClient else { return }
        let formatter = ISO8601DateFormatter()
        var payload: [String: Any] = [
            "productId": transaction.productID,
            "transactionId": String(transaction.id),
            "originalTransactionId": String(transaction.originalID),
            "environment": String(describing: transaction.environment),
        ]
        if let expirationDate = transaction.expirationDate {
            payload["expiresAt"] = formatter.string(from: expirationDate)
        }
        do {
            let _: EmptyResponse = try await apiClient.post("/api/mobile/billing/storekit/sync", json: payload)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Routing

enum AppTab: String, Identifiable, CaseIterable {
    case learn
    case practice
    case profile

    var id: String { rawValue }

    var title: String {
        switch self {
        case .learn: "Learn"
        case .practice: "Practice"
        case .profile: "Profile"
        }
    }

    var symbol: String {
        switch self {
        case .learn: "book.fill"
        case .practice: "waveform.path.ecg.rectangle.fill"
        case .profile: "person.crop.circle"
        }
    }
}

enum Route: Hashable {
    case learnTrack(String)
    case more
    case paywall
}

@MainActor
@Observable
final class RouterPath {
    var path: [Route] = []

    func navigate(to route: Route) {
        path.append(route)
    }

    func reset() {
        path = []
    }
}

@MainActor
@Observable
final class TabRouter {
    private var routers: [AppTab: RouterPath] = [:]

    func router(for tab: AppTab) -> RouterPath {
        if let router = routers[tab] { return router }
        let router = RouterPath()
        routers[tab] = router
        return router
    }

    func binding(for tab: AppTab) -> Binding<[Route]> {
        let router = router(for: tab)
        return Binding(get: { router.path }, set: { router.path = $0 })
    }
}

@MainActor
@Observable
final class ProfileTabIconStore {
    var image: UIImage?
    private var loadedKey: String?

    func load(for user: AppUser?) async {
        let key = [user?.id, user?.avatarUrl].compactMap { $0 }.joined(separator: "|")
        guard key != loadedKey else { return }
        loadedKey = key
        image = nil

        guard let url = AvatarURLBuilder.displayURL(for: user, format: .png) else { return }

        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            guard let source = UIImage(data: data) else { return }
            image = Self.renderTabImage(from: source)
        } catch {
            image = nil
        }
    }

    private static func renderTabImage(from source: UIImage) -> UIImage {
        let size = CGSize(width: 24, height: 24)
        let format = UIGraphicsImageRendererFormat()
        format.scale = UIScreen.main.scale
        format.opaque = false

        return UIGraphicsImageRenderer(size: size, format: format).image { _ in
            UIBezierPath(roundedRect: CGRect(origin: .zero, size: size), cornerRadius: 7).addClip()

            let scale = max(size.width / source.size.width, size.height / source.size.height)
            let drawSize = CGSize(width: source.size.width * scale, height: source.size.height * scale)
            let drawRect = CGRect(
                x: (size.width - drawSize.width) / 2,
                y: (size.height - drawSize.height) / 2,
                width: drawSize.width,
                height: drawSize.height
            )
            source.draw(in: drawRect)
        }.withRenderingMode(.alwaysOriginal)
    }
}

struct StudentAppView: View {
    @State private var selectedTab: AppTab = .learn
    @State private var tabRouter = TabRouter()
    @State private var profileTabIcon = ProfileTabIconStore()
    @Environment(PracticeSessionStore.self) private var practice
    @Environment(AuthSession.self) private var auth

    var body: some View {
        TabView(selection: $selectedTab) {
            ForEach(AppTab.allCases) { tab in
                NavigationStack(path: tabRouter.binding(for: tab)) {
                    tabContent(tab)
                        .navigationTitle("")
                        .navigationBarTitleDisplayMode(.inline)
                        .navigationDestination(for: Route.self) { route in
                            switch route {
                            case .learnTrack(let id):
                                TrackDetailView(trackID: id)
                            case .more:
                                MoreView()
                            case .paywall:
                                PaywallView()
                            }
                        }
                }
                .environment(tabRouter.router(for: tab))
                .tabItem { tabItem(for: tab) }
                .tag(tab)
            }
        }
        .task(id: profileIconCacheKey) {
            await profileTabIcon.load(for: auth.currentUser)
        }
        .fullScreenCover(item: Binding(
            get: { practice.activeSession },
            set: { practice.activeSession = $0 }
        )) { route in
            PracticeSessionView(route: route)
        }
    }

    @ViewBuilder
    private func tabItem(for tab: AppTab) -> some View {
        if tab == .profile {
            if let image = profileTabIcon.image {
                Image(uiImage: image)
            } else {
                Image(systemName: "person.crop.circle.fill")
            }
            Text(tab.title)
        } else {
            Label(tab.title, systemImage: tab.symbol)
        }
    }

    private var profileIconCacheKey: String {
        [auth.currentUser?.id, auth.currentUser?.avatarUrl].compactMap { $0 }.joined(separator: "|")
    }

    @ViewBuilder
    private func tabContent(_ tab: AppTab) -> some View {
        switch tab {
        case .learn: LearnView()
        case .practice: PracticeView()
        case .profile: ProfileView()
        }
    }
}

// MARK: - Auth

struct AuthView: View {
    @Environment(AuthSession.self) private var auth
    @State private var isSignup = false
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 22) {
                Spacer()
                VStack(spacing: 8) {
                    Image("MedLabLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 190, height: 52)
                        .accessibilityLabel("MedLab")
                    Text(isSignup ? "Create your student account." : "Sign in to continue your clinical training.")
                        .font(.instrument(size: 14, relativeTo: .subheadline))
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }

                VStack(spacing: 12) {
                    if isSignup {
                        TextField("Full name", text: $name)
                            .textContentType(.name)
                            .medLabField()
                    }
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .medLabField()
                    SecureField("Password", text: $password)
                        .textContentType(isSignup ? .newPassword : .password)
                        .medLabField()
                }

                if let error = auth.errorMessage {
                    Text(error)
                        .font(.instrument(size: 13, relativeTo: .footnote))
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button {
                    Task {
                        if isSignup {
                            await auth.signUp(name: name, email: email, password: password)
                        } else {
                            await auth.signIn(email: email, password: password)
                        }
                    }
                } label: {
                    HStack {
                        if auth.isLoading { SwiftUI.ProgressView().tint(.white) }
                        Text(isSignup ? "Create Account" : "Sign In")
                    }
                }
                .buttonStyle(MedLabChinButtonStyle(kind: .primary, height: 52, expands: true))
                .disabled(auth.isLoading || email.isEmpty || password.isEmpty || (isSignup && name.isEmpty))

                Button(isSignup ? "Already have an account? Sign in" : "New to MedLab? Create an account") {
                    isSignup.toggle()
                }
                .font(.instrument(size: 13, weight: .medium, relativeTo: .footnote))

                Text("Institution and admin dashboards remain available on the web for this v1 iOS release.")
                    .font(.instrument(size: 12, relativeTo: .caption))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                Spacer()
            }
            .padding(24)
            .background(Color.medCanvas)
        }
    }
}

// MARK: - Student screens

struct LearnView: View {
    @Environment(AuthSession.self) private var auth
    @Environment(RouterPath.self) private var router
    @Environment(StudentStatsStore.self) private var stats
    @Environment(PracticeSessionStore.self) private var practice

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 18) {
                ScreenTitle("Learn")

                HeaderBlock(
                    title: "\(greeting()), \(auth.currentUser?.name.split(separator: " ").first.map(String.init) ?? "there")",
                    subtitle: stats.stats.casesCompleted + stats.stats.simulationsCompleted > 0
                        ? "Pick up where you left off, or start something new."
                        : "Start a training track or jump into a quick drill."
                )

                Button {
                    practice.activeSession = .ecgSimulation
                } label: {
                    HStack(spacing: 14) {
                        Image(systemName: "play.fill")
                            .frame(width: 40, height: 40)
                            .background(.white.opacity(0.16), in: RoundedRectangle(cornerRadius: 10))
                        VStack(alignment: .leading) {
                            Text("Continue practicing")
                                .font(.instrument(size: 16, weight: .semibold, relativeTo: .headline))
                            Text("\(stats.stats.simulationsCompleted) simulations completed - \(stats.stats.casesCompleted) cases solved")
                                .font(.instrument(size: 14, relativeTo: .subheadline))
                                .opacity(0.75)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                    }
                    .foregroundStyle(.white)
                    .padding()
                    .background(Color.blue, in: RoundedRectangle(cornerRadius: 18))
                }

                SectionLabel("Training tracks")
                TrackCard(title: "ECG Fundamentals", subtitle: "Rhythm recognition, axis determination, and interval analysis.", symbol: "waveform.path.ecg", tint: .blue) {
                    router.navigate(to: .learnTrack("ecg-fundamentals"))
                }

                SectionLabel("Quick practice")
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 145), spacing: 12)], spacing: 12) {
                    QuickPracticeButton(title: "ECG Drill", subtitle: "Timed rhythm ID", symbol: "heart.text.square") {
                        practice.activeSession = .ecgSimulation
                    }
                    QuickPracticeButton(title: "Case Set", subtitle: "Clinical scenarios", symbol: "clipboard") {
                        practice.activeSession = .ecgCase
                    }
                }
            }
            .padding()
        }
        .background(Color.medCanvas)
        .task { await stats.refresh() }
    }
}

struct PracticeView: View {
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(PracticeSessionStore.self) private var practice
    @Environment(RouterPath.self) private var router

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 20) {
                ScreenTitle("Practice")
                HeaderBlock(title: "Choose a workbench", subtitle: "Native Cardiology ECG workbenches for short clinical training loops.")
                PracticeSection(title: "ECG", symbol: "waveform.path.ecg", tint: .red) {
                    PracticeCard(title: "ECG Simulation", subtitle: "Interactive 12-lead rhythm interpretation.", entitlement: "ecg.practice", route: .ecgSimulation)
                    PracticeCard(title: "ECG Cases", subtitle: "Full patient history and report feedback.", entitlement: "ecg.cases", route: .ecgCase)
                }
                PracticeSection(title: "X-Ray", symbol: "viewfinder", tint: .green) {
                    PracticeCard(title: "X-Ray Simulation", subtitle: "Image viewer with interpretation steps.", entitlement: "xray.practice", route: .xraySimulation, isComingSoon: true)
                    PracticeCard(title: "X-Ray Cases", subtitle: "Guided clinical radiograph cases.", entitlement: "xray.cases", route: .xrayCase, isComingSoon: true)
                }
                PracticeSection(title: "CT", symbol: "circle.hexagongrid", tint: .purple) {
                    PracticeCard(title: "CT Simulation", subtitle: "Thoracic CT slice review.", entitlement: "ct.practice", route: .ctSimulation, isComingSoon: true)
                    PracticeCard(title: "CT Cases", subtitle: "Case-based CT reporting.", entitlement: "ct.cases", route: .ctCase, isComingSoon: true)
                }
            }
            .padding()
        }
        .background(Color.medCanvas)
        .task { await entitlements.refresh() }
        .environment(practice)
        .environment(router)
    }
}

struct JourneyView: View {
    private let ecgNodes = ["Rate", "Rhythm", "Intervals", "Axis", "Hypertrophy", "Ischemia", "Synthesis"]

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 18) {
                HeaderBlock(title: "Journey", subtitle: "Keep one calm routine for progressive Cardiology ECG practice.")

                ForEach(Array(ecgNodes.enumerated()), id: \.offset) { index, node in
                    HStack(spacing: 14) {
                        Text("\(index + 1)")
                            .font(.instrument(size: 16, weight: .semibold, relativeTo: .headline).monospacedDigit())
                            .frame(width: 38, height: 38)
                            .background(index < 3 ? Color.blue : Color.gray.opacity(0.18), in: Circle())
                            .foregroundStyle(index < 3 ? .white : .secondary)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(node)
                                .font(.instrument(size: 16, weight: .semibold, relativeTo: .headline))
                            Text(index < 3 ? "Ready for review" : "Unlock through consistent practice")
                                .font(.instrument(size: 12, relativeTo: .caption))
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                    }
                    .padding()
                    .background(.white, in: RoundedRectangle(cornerRadius: 16))
                }
            }
            .padding()
        }
        .background(Color.medCanvas)
    }
}

struct ProgressViewScreen: View {
    @Environment(StudentStatsStore.self) private var stats

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 16) {
                HeaderBlock(title: "Progress", subtitle: "XP, streaks, and completion metrics from your MedLab activity.")
                HStack {
                    StatTile(title: "Level", value: "\(stats.stats.currentLevel)", symbol: "star.circle.fill")
                    StatTile(title: "XP", value: "\(stats.stats.totalXP)", symbol: "bolt.fill")
                }
                HStack {
                    StatTile(title: "Streak", value: "\(stats.stats.currentStreak)d", symbol: "flame.fill")
                    StatTile(title: "Cases", value: "\(stats.stats.casesCompleted)", symbol: "clipboard.fill")
                }
                AppCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Next level")
                            .font(.instrument(size: 16, weight: .semibold, relativeTo: .headline))
                        SwiftUI.ProgressView(value: levelProgress)
                        Text("\(Int(levelProgress * 100))% through level \(stats.stats.currentLevel)")
                            .font(.instrument(size: 12, relativeTo: .caption))
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding()
        }
        .background(Color.medCanvas)
        .task { await stats.refresh() }
    }

    private var levelProgress: Double {
        let level = max(stats.stats.currentLevel, 1)
        let lower = Double((level - 1) * (level - 1) * 100)
        let upper = Double(level * level * 100)
        return min(1, max(0, (Double(stats.stats.totalXP) - lower) / max(1, upper - lower)))
    }
}

struct ProfileView: View {
    @Environment(AuthSession.self) private var auth
    @Environment(MedLabAPIClient.self) private var apiClient
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(StudentStatsStore.self) private var stats
    @Environment(StoreKitSubscriptionStore.self) private var store
    @Environment(RouterPath.self) private var router
    @State private var showingDeleteConfirm = false
    @State private var displayName = ""
    @State private var isSavingName = false
    @State private var saveMessage: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                ScreenTitle("Profile")
                    .padding(.bottom, 24)

                profileHeader

                HStack(spacing: 12) {
                    ProfileStatTile(symbol: "flame.fill", symbolColor: .orange, label: "Streak", value: "\(stats.stats.currentStreak)d")
                    ProfileStatTile(symbol: "diamond.fill", symbolColor: .blue, label: "Total XP", value: "\(stats.stats.totalXP)")
                    ProfileStatTile(symbol: "star.circle.fill", symbolColor: .yellow, label: "Level", value: "\(stats.stats.currentLevel)")
                }
                .padding(.top, 28)

                VStack(alignment: .leading, spacing: 12) {
                    Text("Settings")
                        .font(.instrument(size: 14, weight: .semibold))
                        .foregroundStyle(Color.medInk)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Display Name")
                            .font(.instrument(size: 12, weight: .medium))
                            .foregroundStyle(Color.medMuted)
                        HStack(spacing: 12) {
                            TextField("Your Name", text: $displayName)
                                .font(.instrument(size: 14, weight: .medium))
                                .medLabField()
                            Button(isSavingName ? "Saving..." : "Save") {
                                Task { await saveDisplayName() }
                            }
                            .buttonStyle(MedLabChinButtonStyle(kind: .primary, height: 44, horizontalPadding: 20))
                            .disabled(isSavingName || displayName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        }
                        if let saveMessage {
                            Text(saveMessage)
                                .font(.instrument(size: 12, weight: .medium))
                                .foregroundStyle(saveMessage == "Saved" ? .green : .red)
                        }
                    }
                }
                .padding(.top, 30)

                billingSection
                    .padding(.top, 30)

                VStack(spacing: 12) {
                    Button {
                        router.navigate(to: .more)
                    } label: {
                        ProfileActionRow(symbol: "text.book.closed.fill", title: "Reference library", subtitle: "ECG criteria, ranges, and study materials", tint: .blue)
                    }
                    .buttonStyle(.plain)

                    HStack(spacing: 12) {
                        Button("Sign Out") {
                            auth.signOut()
                        }
                        .buttonStyle(MedLabChinButtonStyle(kind: .secondary, height: 44, expands: true))

                        Button("Delete Account") {
                            showingDeleteConfirm = true
                        }
                        .buttonStyle(MedLabChinButtonStyle(kind: .danger, height: 44, expands: true))
                    }
                }
                .padding(.top, 30)
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 32)
            .frame(maxWidth: 680, alignment: .leading)
        }
        .background(Color.white)
        .task {
            displayName = auth.currentUser?.name ?? ""
            await entitlements.refresh()
            await stats.refresh()
            await store.loadProducts()
        }
        .confirmationDialog("Delete your MedLab account?", isPresented: $showingDeleteConfirm, titleVisibility: .visible) {
            Button("Delete Account", role: .destructive) {
                Task { await auth.deleteAccount() }
            }
        } message: {
            Text("This removes your account access. This action cannot be undone from the app.")
        }
    }

    private var profileHeader: some View {
        HStack(alignment: .top, spacing: 24) {
            ZStack(alignment: .bottomTrailing) {
                ProfileAvatar(user: auth.currentUser, size: 120)
                Button {} label: {
                    Image(systemName: "pencil")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Color.medMuted)
                        .frame(width: 36, height: 36)
                        .background(.white, in: Circle())
                        .overlay(Circle().stroke(Color.medBorder, lineWidth: 1.5))
                        .shadow(color: .black.opacity(0.08), radius: 4, y: 2)
                }
                .buttonStyle(.plain)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(auth.currentUser?.name.isEmpty == false ? auth.currentUser?.name ?? "Your Name" : "Your Name")
                    .font(.instrument(size: 26, weight: .semibold))
                    .foregroundStyle(Color.medInk)
                    .lineLimit(1)
                Text(auth.currentUser?.email ?? "")
                    .font(.instrument(size: 14))
                    .foregroundStyle(Color.medSoft)
                    .lineLimit(1)
                Text("Joined \(joinedDateText)")
                    .font(.instrument(size: 12))
                    .foregroundStyle(Color.medSoft)
            }
            .padding(.top, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var billingSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Image(systemName: "creditcard.fill")
                    .font(.system(size: 15, weight: .semibold))
                Text("Billing")
                    .font(.instrument(size: 14, weight: .semibold))
            }
            .foregroundStyle(Color.medInk)

            VStack(spacing: 0) {
                HStack(spacing: 12) {
                    Image(systemName: "creditcard.fill")
                        .foregroundStyle(isPro ? .blue : Color.medSoft)
                        .frame(width: 40, height: 40)
                        .background(isPro ? Color.medBlueSoft : Color.medPanel, in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(isPro ? Color.medBlueBorder : Color.medBorder, lineWidth: 1.5))
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 8) {
                            Text(isPro ? "MedLab Pro" : "Free Plan")
                                .font(.instrument(size: 14, weight: .semibold))
                                .foregroundStyle(Color.medInk)
                            if isPro && entitlements.response.status == "active" {
                                Text("Active")
                                    .font(.instrument(size: 10, weight: .bold))
                                    .textCase(.uppercase)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 3)
                                    .background(Color(red: 0.925, green: 0.992, blue: 0.961), in: RoundedRectangle(cornerRadius: 6))
                                    .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color(red: 0.655, green: 0.953, blue: 0.816)))
                                    .foregroundStyle(Color(red: 0.02, green: 0.588, blue: 0.412))
                            }
                        }
                        Text(isPro ? "Billed through App Store" : "3 cases/day - core modules only")
                            .font(.instrument(size: 12))
                            .foregroundStyle(Color.medSoft)
                    }
                    Spacer()
                    if !isPro {
                        Button("Upgrade") {
                            router.navigate(to: .paywall)
                        }
                        .buttonStyle(MedLabChinButtonStyle(kind: .primary, height: 40, horizontalPadding: 18))
                    }
                }
                .padding(18)

                Divider()

                Button {
                    Task { await store.refreshEntitlements() }
                } label: {
                    HStack {
                        Text("Restore Purchases")
                            .font(.instrument(size: 13, weight: .semibold))
                        Spacer()
                        Image(systemName: "arrow.clockwise")
                    }
                    .foregroundStyle(Color.medInk)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 14)
                }
                .buttonStyle(.plain)
            }
            .background(.white, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.medBorder, lineWidth: 1.5))
        }
    }

    private var isPro: Bool {
        entitlements.response.plan == "pro"
    }

    private var joinedDateText: String {
        guard let createdAt = auth.currentUser?.createdAt else { return "-" }
        let iso = ISO8601DateFormatter()
        if let date = iso.date(from: createdAt) {
            return date.formatted(.dateTime.month(.wide).year())
        }
        return "-"
    }

    private func saveDisplayName() async {
        isSavingName = true
        saveMessage = nil
        defer { isSavingName = false }
        do {
            let response: ProfileUpdateResponse = try await apiClient.patch("/api/mobile/profile", json: [
                "fullName": displayName.trimmingCharacters(in: .whitespacesAndNewlines)
            ])
            auth.currentUser?.name = response.profile.fullName ?? displayName
            saveMessage = "Saved"
        } catch {
            saveMessage = error.localizedDescription
        }
    }
}

struct MoreView: View {
    private let references = [
        ("Normal Lab Values", "Na, K, CBC, LFTs, renal, metabolic ranges", "list.clipboard"),
        ("ECG Criteria", "Rate, rhythm, intervals, STEMI, blocks", "waveform.path.ecg"),
        ("Drug Dosing Ranges", "Common emergency and ward medications", "pills"),
        ("Imaging Checklist", "Chest X-Ray and CT systematic review", "viewfinder"),
    ]

    var body: some View {
        List(references, id: \.0) { item in
            VStack(alignment: .leading, spacing: 6) {
                Label(item.0, systemImage: item.2)
                    .font(.instrument(size: 16, weight: .semibold, relativeTo: .headline))
                Text(item.1)
                    .font(.instrument(size: 14, relativeTo: .subheadline))
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 4)
        }
        .navigationTitle("Reference")
    }
}

struct TrackDetailView: View {
    let trackID: String

    var body: some View {
        if trackID == "chest-xray" {
            RadiologyComingSoonScreen(title: "Radiology is coming soon")
        } else {
            List {
                Section("ECG Fundamentals") {
                    ForEach(modules, id: \.self) { module in
                        Label(module, systemImage: "checkmark.circle")
                    }
                }
            }
        }
    }

    private var modules: [String] {
        ["Rate", "Rhythm", "Intervals", "Axis", "Waveform abnormalities"]
    }
}

struct PaywallView: View {
    @Environment(StoreKitSubscriptionStore.self) private var store

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("MedLab Pro")
                        .font(.instrument(size: 34, weight: .bold, relativeTo: .largeTitle))
                    Text("Unlimited Cardiology ECG practice, advanced cases, and full AI feedback. Radiology modules are coming soon.")
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical)
            }

            Section("Subscriptions") {
                if store.products.isEmpty {
                    Text("Products load from App Store Connect or the local StoreKit configuration.")
                        .foregroundStyle(.secondary)
                }
                ForEach(store.products, id: \.id) { product in
                    Button {
                        Task { await store.purchase(product) }
                    } label: {
                        HStack {
                            VStack(alignment: .leading) {
                                Text(product.displayName)
                                Text(product.description)
                                    .font(.instrument(size: 12, relativeTo: .caption))
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text(product.displayPrice)
                                .font(.instrument(size: 16, weight: .semibold, relativeTo: .headline))
                        }
                    }
                }
            }

            Section {
                Button("Restore Purchases") {
                    Task { await store.refreshEntitlements() }
                }
            }
        }
        .navigationTitle("Upgrade")
        .task { await store.loadProducts() }
    }
}

// MARK: - Workbenches

struct PracticeSessionView: View {
    let route: PracticeRoute

    var body: some View {
        switch route {
        case .ecgSimulation:
            ECGWorkbenchView(mode: .simulation)
        case .ecgCase:
            ECGWorkbenchView(mode: .caseBased)
        case .xraySimulation:
            RadiologyComingSoonSession()
        case .xrayCase:
            RadiologyComingSoonSession()
        case .ctSimulation:
            RadiologyComingSoonSession()
        case .ctCase:
            RadiologyComingSoonSession()
        }
    }
}

enum WorkbenchMode: String {
    case simulation
    case caseBased
}

struct ECGParams: Equatable {
    var heartRate: Int
    var rhythm: String
    var stElevation: Bool
    var stDepression: Bool
    var qWaves: Bool = false
    var tWaveInversion: Bool = false
    var leftAxis: Bool
    var rightAxis: Bool

    static func random() -> ECGParams {
        [
            ECGParams(heartRate: 75, rhythm: "normal", stElevation: false, stDepression: false, leftAxis: false, rightAxis: false),
            ECGParams(heartRate: 55, rhythm: "bradycardia", stElevation: false, stDepression: false, qWaves: false, leftAxis: false, rightAxis: false),
            ECGParams(heartRate: 45, rhythm: "bradycardia", stElevation: false, stDepression: true, leftAxis: false, rightAxis: false),
            ECGParams(heartRate: 35, rhythm: "bradycardia", stElevation: false, stDepression: false, qWaves: true, leftAxis: false, rightAxis: false),
            ECGParams(heartRate: 160, rhythm: "tachycardia", stElevation: false, stDepression: false, leftAxis: false, rightAxis: false),
            ECGParams(heartRate: 140, rhythm: "tachycardia", stElevation: false, stDepression: false, leftAxis: false, rightAxis: true),
            ECGParams(heartRate: 95, rhythm: "normal", stElevation: true, stDepression: false, leftAxis: false, rightAxis: false),
            ECGParams(heartRate: 90, rhythm: "normal", stElevation: false, stDepression: false, qWaves: true, tWaveInversion: true, leftAxis: false, rightAxis: false),
            ECGParams(heartRate: 82, rhythm: "normal", stElevation: false, stDepression: true, leftAxis: true, rightAxis: false),
            ECGParams(heartRate: 88, rhythm: "normal", stElevation: false, stDepression: true, leftAxis: false, rightAxis: true),
            ECGParams(heartRate: 170, rhythm: "tachycardia", stElevation: false, stDepression: true, leftAxis: false, rightAxis: false),
            ECGParams(heartRate: 120, rhythm: "afib", stElevation: false, stDepression: true, leftAxis: false, rightAxis: false),
            ECGParams(heartRate: 130, rhythm: "tachycardia", stElevation: true, stDepression: false, qWaves: true, leftAxis: false, rightAxis: false),
        ].randomElement()!
    }

    var jsonContext: String {
        """
        {"heartRate":\(heartRate),"rhythm":"\(rhythm)","duration":10,"sampleRate":500,"abnormalities":{"stElevation":\(stElevation),"stDepression":\(stDepression),"qWaves":\(qWaves),"tWaveInversion":\(tWaveInversion),"leftAxis":\(leftAxis),"rightAxis":\(rightAxis)}}
        """
    }
}

struct ECGWorkbenchView: View {
    let mode: WorkbenchMode
    @Environment(PracticeSessionStore.self) private var practice
    @Environment(MedLabAPIClient.self) private var apiClient
    @Environment(StudentStatsStore.self) private var stats
    @State private var params = ECGParams.random()
    @State private var zoom = 1.0
    @State private var answer = ""
    @State private var feedback: AIValidationResponse?
    @State private var isSubmitting = false

    var body: some View {
        VStack(spacing: 0) {
            SessionTopBar(title: mode == .simulation ? "ECG Simulation" : "ECG Case Study") {
                practice.activeSession = nil
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if mode == .caseBased {
                        AppCard {
                            Text("58-year-old patient with palpitations and intermittent chest pressure. Review the 12-lead ECG and submit a concise interpretation.")
                                .font(.instrument(size: 14, relativeTo: .subheadline))
                        }
                    }

                    ScrollView(.horizontal, showsIndicators: true) {
                        ECGCanvas(params: params, zoom: zoom)
                            .frame(width: 1200 * zoom, height: 630 * zoom)
                    }
                    .frame(height: 630 * zoom)
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                    HStack {
                        Stepper("Zoom \(zoom, specifier: "%.2fx")", value: $zoom, in: 1...3, step: 0.25)
                        Button("New ECG") {
                            params = .random()
                            feedback = nil
                            answer = ""
                        }
                    }
                    .font(.instrument(size: 14, relativeTo: .subheadline))

                    AppCard {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("AI Attending")
                                .font(.instrument(size: 16, weight: .semibold, relativeTo: .headline))
                            Text(mode == .simulation ? "Start with rate and rhythm. What is the dominant interpretation?" : "Submit your case interpretation and differential.")
                                .font(.instrument(size: 14, relativeTo: .subheadline))
                                .foregroundStyle(.secondary)
                            TextField("Your answer", text: $answer, axis: .vertical)
                                .lineLimit(3...6)
                                .medLabField()
                            Button {
                                Task { await submitAnswer() }
                            } label: {
                                HStack {
                                    if isSubmitting { SwiftUI.ProgressView() }
                                    Text("Submit")
                                }
                            }
                            .buttonStyle(MedLabChinButtonStyle(kind: .primary, height: 44))
                            .disabled(answer.isEmpty || isSubmitting)
                            if let feedback {
                                Divider()
                                Label(feedback.isCorrect ? "Correct" : "Review", systemImage: feedback.isCorrect ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                                    .foregroundStyle(feedback.isCorrect ? .green : .orange)
                                Text(feedback.feedback)
                                if let explanation = feedback.explanation, !explanation.isEmpty {
                                    Text(explanation)
                                        .font(.instrument(size: 12, relativeTo: .caption))
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }
                .padding()
            }
        }
        .background(Color.medCanvas)
    }

    private func submitAnswer() async {
        isSubmitting = true
        defer { isSubmitting = false }
        do {
            let response: AIValidationResponse = try await apiClient.post("/api/mobile/ai/validate", json: [
                "studentAnswer": answer,
                "question": "Interpret this ECG.",
                "context": params.jsonContext,
                "specialty": "ECG Interpretation",
            ])
            feedback = response
            if response.isCorrect {
                let _: XPResponse = try await apiClient.post("/api/mobile/xp/award", json: [
                    "action": "ecg_step_correct",
                    "data": ["mode": mode.rawValue],
                    "context": ["isFirstTry": true],
                ])
                await stats.refresh()
            }
        } catch {
            feedback = AIValidationResponse(isCorrect: false, feedback: error.localizedDescription, explanation: nil)
        }
    }
}

struct ECGCanvas: View {
    let params: ECGParams
    let zoom: Double

    var body: some View {
        Canvas { context, size in
            let totalWidth = size.width
            let rowHeight = 140.0 * zoom
            let rhythmHeight = 160.0 * zoom
            let marginTop = 15.0 * zoom
            let totalHeight = rowHeight * 3 + rhythmHeight + marginTop * 2 + 20 * zoom
            let visibleHeight = min(size.height, totalHeight)
            let rect = CGRect(x: 0, y: 0, width: totalWidth, height: visibleHeight)

            context.fill(Path(rect), with: .color(Color(red: 253 / 255, green: 226 / 255, blue: 228 / 255)))
            drawGrid(in: &context, width: totalWidth, height: visibleHeight)

            let colWidth = floor(totalWidth / 4)
            let grid: [[ECGLeadName]] = [
                [.i, .aVR, .v1, .v4],
                [.ii, .aVL, .v2, .v5],
                [.iii, .aVF, .v3, .v6],
            ]

            for (rowIndex, row) in grid.enumerated() {
                for (colIndex, lead) in row.enumerated() {
                    let waveform = ECGWaveformGenerator.generate(lead: lead, params: params, duration: 2.5)
                    drawLeadStrip(
                        in: &context,
                        waveform: waveform,
                        x0: Double(colIndex) * colWidth,
                        y0: marginTop + Double(rowIndex) * rowHeight,
                        width: colWidth,
                        height: rowHeight,
                        label: lead.rawValue
                    )
                }
            }

            let rhythmWaveform = ECGWaveformGenerator.generate(lead: .ii, params: params, duration: 10)
            drawLeadStrip(
                in: &context,
                waveform: rhythmWaveform,
                x0: 0,
                y0: marginTop + rowHeight * 3 + 20 * zoom,
                width: totalWidth,
                height: rhythmHeight,
                label: ECGLeadName.ii.rawValue
            )
        }
        .accessibilityLabel("12-lead ECG waveform")
    }

    private func drawGrid(in context: inout GraphicsContext, width: Double, height: Double) {
        var minorGrid = Path()
        stride(from: 0.0, through: width, by: 5.0 * zoom).forEach { x in
            minorGrid.move(to: CGPoint(x: x, y: 0))
            minorGrid.addLine(to: CGPoint(x: x, y: height))
        }
        stride(from: 0.0, through: height, by: 5.0 * zoom).forEach { y in
            minorGrid.move(to: CGPoint(x: 0, y: y))
            minorGrid.addLine(to: CGPoint(x: width, y: y))
        }
        context.stroke(minorGrid, with: .color(Color(red: 248 / 255, green: 205 / 255, blue: 210 / 255)), lineWidth: 0.5)

        var majorGrid = Path()
        stride(from: 0.0, through: width, by: 25.0 * zoom).forEach { x in
            majorGrid.move(to: CGPoint(x: x, y: 0))
            majorGrid.addLine(to: CGPoint(x: x, y: height))
        }
        stride(from: 0.0, through: height, by: 25.0 * zoom).forEach { y in
            majorGrid.move(to: CGPoint(x: 0, y: y))
            majorGrid.addLine(to: CGPoint(x: width, y: y))
        }
        context.stroke(majorGrid, with: .color(Color(red: 244 / 255, green: 164 / 255, blue: 180 / 255)), lineWidth: 1)
    }

    private func drawLeadStrip(
        in context: inout GraphicsContext,
        waveform: [ECGWaveformPoint],
        x0: Double,
        y0: Double,
        width: Double,
        height: Double,
        label: String
    ) {
        guard let first = waveform.first, let last = waveform.last else { return }

        let midY = y0 + height / 2
        let scaleY = height * 0.33
        let duration = last.x - first.x
        var wave = Path()

        for (index, point) in waveform.enumerated() {
            let t = point.x - first.x
            let x = x0 + (t / duration) * width
            let y = midY - point.y * scaleY
            if index == 0 {
                wave.move(to: CGPoint(x: x, y: y))
            } else {
                wave.addLine(to: CGPoint(x: x, y: y))
            }
        }

        context.drawLayer { layer in
            layer.clip(to: Path(CGRect(x: x0, y: y0, width: width, height: height)))
            layer.stroke(wave, with: .color(Color(red: 17 / 255, green: 17 / 255, blue: 17 / 255)), lineWidth: 1.2)
        }

        let leadLabel = Text(label)
            .font(.system(size: 16 * zoom, weight: .bold, design: .monospaced))
            .foregroundStyle(Color(red: 17 / 255, green: 17 / 255, blue: 17 / 255))
        context.draw(leadLabel, at: CGPoint(x: x0 + 10 * zoom, y: y0 + 18 * zoom), anchor: .topLeading)
    }
}

enum ECGLeadName: String, CaseIterable {
    case i = "I"
    case ii = "II"
    case iii = "III"
    case aVR
    case aVL
    case aVF
    case v1 = "V1"
    case v2 = "V2"
    case v3 = "V3"
    case v4 = "V4"
    case v5 = "V5"
    case v6 = "V6"
}

struct ECGWaveformPoint {
    let x: Double
    let y: Double
}

enum ECGWaveformGenerator {
    static func generate(lead: ECGLeadName, params: ECGParams, duration: Double, sampleRate: Int = 500) -> [ECGWaveformPoint] {
        let base = generateBaseSignal(heartRate: Double(params.heartRate), duration: duration, sampleRate: sampleRate)
        let projected = projectTo12Leads(base: base)
        let samples = projected[lead] ?? projected[.ii] ?? []

        return samples.enumerated().map { index, sample in
            let time = Double(index) / Double(sampleRate)
            let noise = (staticNoise(index: index, lead: lead) - 0.5) * 0.01
            return ECGWaveformPoint(x: time, y: sample + noise)
        }
    }

    private static func ecgBeat(_ t: Double) -> Double {
        var value = 0.0
        value += 0.18 * exp(-pow((t - 0.12) / 0.035, 2))
        value += -0.3 * exp(-pow((t - 0.2) / 0.01, 2))
        value += 1.25 * exp(-pow((t - 0.22) / 0.012, 2))
        value += -0.4 * exp(-pow((t - 0.24) / 0.014, 2))
        value += 0.4 * exp(-pow((t - 0.38) / 0.055, 2))
        return value
    }

    private static func generateBaseSignal(heartRate: Double, duration: Double, sampleRate: Int) -> [Double] {
        let sampleCount = Int(floor(duration * Double(sampleRate)))
        let beatsPerSecond = heartRate / 60
        let rr = 1 / beatsPerSecond

        return (0..<sampleCount).map { index in
            let time = Double(index) / Double(sampleRate)
            let phase = time.truncatingRemainder(dividingBy: rr) / rr
            var value = ecgBeat(phase)
            value += 0.03 * sin(2 * Double.pi * 0.3 * time)

            let beatIndex = Int(floor(time / rr))
            let jitterSeed = (beatIndex * 9301 + 49297) % 233280
            let jitter = 1 + ((Double(jitterSeed) / 233280) - 0.5) * 0.08
            value *= jitter

            return value
        }
    }

    private static func projectTo12Leads(base: [Double]) -> [ECGLeadName: [Double]] {
        var leads = Dictionary(uniqueKeysWithValues: ECGLeadName.allCases.map { ($0, Array(repeating: 0.0, count: base.count)) })

        for (index, d) in base.enumerated() {
            let ra = -0.4 * d
            let la = 0.1 * d
            let ll = 0.4 * d
            let average = (ra + la + ll) / 3

            leads[.i]?[index] = la - ra
            leads[.ii]?[index] = ll - ra
            leads[.iii]?[index] = ll - la
            leads[.aVR]?[index] = ra - average
            leads[.aVL]?[index] = la - average
            leads[.aVF]?[index] = ll - average
            leads[.v1]?[index] = -0.5 * d
            leads[.v2]?[index] = -0.2 * d
            leads[.v3]?[index] = 0.2 * d
            leads[.v4]?[index] = 0.6 * d
            leads[.v5]?[index] = 0.9 * d
            leads[.v6]?[index] = 0.8 * d
        }

        return leads
    }

    private static func staticNoise(index: Int, lead: ECGLeadName) -> Double {
        let leadOffset = ECGLeadName.allCases.firstIndex(of: lead) ?? 0
        let seed = UInt64(index &* 1103515245 &+ leadOffset &* 12345 &+ 67890)
        return Double(seed % 10_000) / 10_000
    }
}

struct ImagingWorkbenchView: View {
    let mode: WorkbenchMode
    let modality: String
    @Environment(PracticeSessionStore.self) private var practice
    @Environment(MedLabAPIClient.self) private var apiClient
    @State private var pathology = "pneumonia"
    @State private var severity = "moderate"
    @State private var imageURL: URL?
    @State private var isLoading = false
    @State private var zoom = 1.0
    @State private var pan = CGSize.zero
    @State private var answer = ""
    @State private var feedback: AIValidationResponse?

    var body: some View {
        VStack(spacing: 0) {
            SessionTopBar(title: "\(modality == "CT" ? "CT" : "X-Ray") \(mode == .simulation ? "Simulation" : "Case Study")") {
                practice.activeSession = nil
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if mode == .simulation {
                        Picker("Pathology", selection: $pathology) {
                            Text("Pneumonia").tag("pneumonia")
                            Text("Effusion").tag("pleural_effusion")
                            Text("Pneumothorax").tag("pneumothorax")
                            Text("Cardiomegaly").tag("cardiomegaly")
                        }
                        .pickerStyle(.segmented)
                    } else {
                        AppCard {
                            Text("Case history: progressive dyspnea and abnormal imaging. Review the study and submit an impression.")
                                .font(.instrument(size: 14, relativeTo: .subheadline))
                        }
                    }

                    ZStack {
                        RoundedRectangle(cornerRadius: 18)
                            .fill(Color.black)
                        if let imageURL {
                            AsyncImage(url: imageURL) { phase in
                                switch phase {
                                case .success(let image):
                                    image
                                        .resizable()
                                        .scaledToFit()
                                        .scaleEffect(zoom)
                                        .offset(pan)
                                        .gesture(DragGesture().onChanged { pan = $0.translation })
                                case .failure:
                                    ContentUnavailableView("Image unavailable", systemImage: "xmark.octagon")
                                default:
                                    SwiftUI.ProgressView()
                                }
                            }
                        } else {
                            ContentUnavailableView("No image loaded", systemImage: "viewfinder", description: Text("Generate a study to begin."))
                                .foregroundStyle(.white)
                        }
                    }
                    .frame(height: 420)

                    HStack {
                        Button("Generate") { Task { await generateImage() } }
                            .buttonStyle(MedLabChinButtonStyle(kind: .primary, height: 44, horizontalPadding: 20))
                        Stepper("Zoom \(zoom, specifier: "%.2fx")", value: $zoom, in: 1...3, step: 0.25)
                    }

                    AppCard {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Interpretation")
                                .font(.instrument(size: 16, weight: .semibold, relativeTo: .headline))
                            Text("Describe view, quality, primary pattern, localization, and final impression.")
                                .font(.instrument(size: 14, relativeTo: .subheadline))
                                .foregroundStyle(.secondary)
                            TextField("Your impression", text: $answer, axis: .vertical)
                                .lineLimit(3...6)
                                .medLabField()
                            Button("Submit impression") {
                                Task { await submitImpression() }
                            }
                            .buttonStyle(MedLabChinButtonStyle(kind: .primary, height: 44))
                            .disabled(answer.isEmpty)
                            if let feedback {
                                Divider()
                                Text(feedback.feedback)
                                if let explanation = feedback.explanation {
                                    Text(explanation).font(.instrument(size: 12, relativeTo: .caption)).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }
                .padding()
            }
        }
        .background(Color.medCanvas)
        .task { await generateImage() }
    }

    private func generateImage() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: XRayGenerateResponse = try await apiClient.post("/api/mobile/xray/generate", json: [
                "view": "PA",
                "pathology": pathology,
                "severity": severity,
                "seed": Int.random(in: 1...2_000_000),
                "count": 1,
                "source": "real",
                "modality": modality,
            ])
            imageURL = response.images.first.flatMap { URL(string: $0.url) }
            pan = .zero
            zoom = 1
        } catch {
            feedback = AIValidationResponse(isCorrect: false, feedback: error.localizedDescription, explanation: nil)
        }
    }

    private func submitImpression() async {
        do {
            feedback = try await apiClient.post("/api/mobile/ai/validate", json: [
                "studentAnswer": answer,
                "question": "Interpret this \(modality) study.",
                "context": "Pathology: \(pathology). Severity: \(severity). Modality: \(modality).",
                "specialty": modality == "CT" ? "Thoracic CT" : "Chest X-Ray Radiology",
            ])
        } catch {
            feedback = AIValidationResponse(isCorrect: false, feedback: error.localizedDescription, explanation: nil)
        }
    }
}

// MARK: - Components

struct ScreenTitle: View {
    let title: String

    init(_ title: String) {
        self.title = title
    }

    var body: some View {
        Text(title)
            .font(.instrument(size: 28, weight: .bold, relativeTo: .largeTitle))
            .foregroundStyle(Color.medInk)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct HeaderBlock: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.instrument(size: 22, weight: .bold, relativeTo: .title2))
            Text(subtitle)
                .font(.instrument(size: 14, relativeTo: .subheadline))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct SectionLabel: View {
    let title: String

    init(_ title: String) {
        self.title = title
    }

    var body: some View {
        Text(title.uppercased())
            .font(.instrument(size: 12, weight: .semibold, relativeTo: .caption))
            .foregroundStyle(.secondary)
    }
}

struct AppCard<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        content
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(.white, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.medBorder, lineWidth: 1.5))
    }
}

struct ProfileAvatar: View {
    let user: AppUser?
    let size: Double

    var body: some View {
        Group {
            if let url = AvatarURLBuilder.displayURL(for: user, format: .png) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    default:
                        initials
                    }
                }
            } else {
                initials
            }
        }
        .frame(width: size, height: size)
        .background(Color.medBlueSoft)
        .clipShape(Circle())
    }

    private var initials: some View {
        Text(initialsText)
            .font(.instrument(size: size * 0.32, weight: .semibold))
            .foregroundStyle(Color.medBlue)
    }

    private var initialsText: String {
        let name = user?.name.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let parts = name.split(separator: " ")
        let letters = parts.prefix(2).compactMap(\.first).map(String.init).joined()
        return letters.isEmpty ? "ML" : letters.uppercased()
    }
}

struct ProfileTabItem: View {
    let user: AppUser?

    var body: some View {
        Group {
            if let url = AvatarURLBuilder.displayURL(for: user, format: .png) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    default:
                        fallback
                    }
                }
            } else {
                fallback
            }
        }
        .frame(width: 22, height: 22)
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .accessibilityLabel("Profile")
    }

    private var fallback: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6)
                .fill(Color.medBlueSoft)
            Text(initialsText)
                .font(.instrument(size: 9, weight: .bold))
                .foregroundStyle(Color.medBlue)
        }
    }

    private var initialsText: String {
        let name = user?.name.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let parts = name.split(separator: " ")
        let letters = parts.prefix(2).compactMap(\.first).map(String.init).joined()
        return letters.isEmpty ? "ML" : letters.uppercased()
    }
}

enum AvatarURLBuilder {
    enum Format: String {
        case svg
        case png
    }

    static func displayURL(for user: AppUser?, format: Format = .png) -> URL? {
        if let avatarUrl = user?.avatarUrl, !avatarUrl.isEmpty {
            return normalizedDiceBearURL(from: avatarUrl, format: format) ?? URL(string: avatarUrl)
        }
        guard let id = user?.id, !id.isEmpty else { return nil }
        return defaultURL(userID: id, format: format)
    }

    private static func defaultURL(userID: String, format: Format) -> URL? {
        var components = URLComponents(string: "https://api.dicebear.com/9.x/big-smile/\(format.rawValue)")
        components?.queryItems = [
            URLQueryItem(name: "seed", value: userID),
            URLQueryItem(name: "hair", value: "shortHair"),
            URLQueryItem(name: "eyes", value: "cheery"),
            URLQueryItem(name: "mouth", value: "openedSmile"),
            URLQueryItem(name: "skinColor", value: "efcc9f"),
            URLQueryItem(name: "hairColor", value: "220f00"),
            URLQueryItem(name: "backgroundColor", value: "EEF3FF"),
            URLQueryItem(name: "scale", value: "90"),
            URLQueryItem(name: "radius", value: "50"),
            URLQueryItem(name: "accessoriesProbability", value: "0"),
        ]
        return components?.url
    }

    private static func normalizedDiceBearURL(from avatarUrl: String, format: Format) -> URL? {
        guard var components = URLComponents(string: avatarUrl),
              components.host == "api.dicebear.com",
              components.path.contains("/big-smile/")
        else { return nil }
        components.path = components.path.replacingOccurrences(of: "/svg", with: "/\(format.rawValue)")
        return components.url
    }
}

struct ProfileStatTile: View {
    let symbol: String
    let symbolColor: Color
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(spacing: 6) {
                Image(systemName: symbol)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(symbolColor)
                Text(label)
                    .font(.instrument(size: 12, weight: .medium))
                    .foregroundStyle(Color.medMuted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)
            }
            Text(value)
                .font(.instrument(size: 23, weight: .semibold))
                .foregroundStyle(Color.medInk)
                .lineLimit(1)
                .minimumScaleFactor(0.65)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 14)
        .padding(.vertical, 14)
        .background(Color.medPanel, in: RoundedRectangle(cornerRadius: 12))
    }
}

struct ProfileActionRow: View {
    let symbol: String
    let title: String
    let subtitle: String
    let tint: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: symbol)
                .foregroundStyle(tint)
                .frame(width: 40, height: 40)
                .background(tint.opacity(0.11), in: RoundedRectangle(cornerRadius: 12))
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.instrument(size: 14, weight: .semibold))
                    .foregroundStyle(Color.medInk)
                Text(subtitle)
                    .font(.instrument(size: 12))
                    .foregroundStyle(Color.medSoft)
                    .lineLimit(2)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color.medSoft)
        }
        .padding(16)
        .background(.white, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.medBorder, lineWidth: 1.5))
    }
}

enum MedLabButtonKind {
    case primary
    case secondary
    case danger

    var background: Color {
        switch self {
        case .primary: Color.medBlue
        case .secondary: Color.medPanel
        case .danger: Color(red: 0.996, green: 0.949, blue: 0.949)
        }
    }

    var foreground: Color {
        switch self {
        case .primary: .white
        case .secondary: Color.medInk
        case .danger: Color(red: 0.745, green: 0.118, blue: 0.118)
        }
    }

    var border: Color {
        switch self {
        case .primary: Color.medBlueDark
        case .secondary: Color.medBorderStrong
        case .danger: Color(red: 0.996, green: 0.792, blue: 0.792)
        }
    }

    var shadow: Color {
        switch self {
        case .primary: Color.medBlueDark
        case .secondary: Color.medBorderStrong
        case .danger: Color(red: 0.996, green: 0.792, blue: 0.792)
        }
    }
}

struct MedLabChinButtonStyle: ButtonStyle {
    var kind: MedLabButtonKind = .primary
    var height: Double = 44
    var horizontalPadding: Double = 16
    var expands = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.instrument(size: 14, weight: .semibold))
            .foregroundStyle(kind.foreground)
            .frame(minHeight: height)
            .padding(.horizontal, horizontalPadding)
            .frame(maxWidth: expands ? .infinity : nil)
            .background {
                ZStack {
                    if !configuration.isPressed {
                        RoundedRectangle(cornerRadius: 9)
                            .fill(kind.shadow)
                            .offset(y: 3)
                    }
                    RoundedRectangle(cornerRadius: 9)
                        .fill(kind.background)
                }
            }
            .overlay(RoundedRectangle(cornerRadius: 9).stroke(kind.border, lineWidth: 1.5))
            .offset(y: configuration.isPressed ? 3 : 0)
            .padding(.bottom, 3)
            .opacity(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.08), value: configuration.isPressed)
    }
}

struct TrackCard: View {
    let title: String
    let subtitle: String
    let symbol: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: symbol)
                    .frame(width: 42, height: 42)
                    .background(tint.opacity(0.12), in: RoundedRectangle(cornerRadius: 12))
                    .foregroundStyle(tint)
                VStack(alignment: .leading, spacing: 4) {
                    Text(title).font(.instrument(size: 15, weight: .semibold, relativeTo: .headline))
                    Text(subtitle).font(.instrument(size: 14, relativeTo: .subheadline)).foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(.secondary)
            }
            .padding()
            .background(.white, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.medBorder, lineWidth: 1.5))
        }
        .buttonStyle(.plain)
    }
}

struct QuickPracticeButton: View {
    let title: String
    let subtitle: String
    let symbol: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                Image(systemName: symbol)
                    .font(.instrument(size: 20, weight: .semibold, relativeTo: .title3))
                Text(title).font(.instrument(size: 14, weight: .semibold, relativeTo: .headline))
                Text(subtitle).font(.instrument(size: 12, relativeTo: .caption)).foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, minHeight: 105, alignment: .leading)
            .padding()
            .background(Color.medPanel, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.medBorder, lineWidth: 1.5))
        }
        .buttonStyle(.plain)
    }
}

struct PracticeSection<Content: View>: View {
    let title: String
    let symbol: String
    let tint: Color
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: symbol)
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .background(tint, in: RoundedRectangle(cornerRadius: 12))
                Text(title)
                    .font(.instrument(size: 20, weight: .bold, relativeTo: .title3))
            }
            content
        }
    }
}

struct PracticeCard: View {
    let title: String
    let subtitle: String
    let entitlement: String
    let route: PracticeRoute
    var isComingSoon = false
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(PracticeSessionStore.self) private var practice
    @Environment(RouterPath.self) private var router

    var body: some View {
        Button {
            guard !isComingSoon else { return }
            if entitlements.has(entitlement) {
                practice.activeSession = route
            } else {
                router.navigate(to: .paywall)
            }
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title).font(.instrument(size: 15, weight: .semibold, relativeTo: .headline))
                    Text(subtitle).font(.instrument(size: 14, relativeTo: .subheadline)).foregroundStyle(.secondary)
                }
                Spacer()
                if isComingSoon {
                    Label("Coming Soon", systemImage: "clock")
                        .font(.instrument(size: 12, weight: .semibold, relativeTo: .caption))
                        .foregroundStyle(.secondary)
                } else {
                    Image(systemName: entitlements.has(entitlement) ? "play.circle.fill" : "lock.fill")
                        .foregroundStyle(entitlements.has(entitlement) ? .blue : .secondary)
                }
            }
            .padding()
            .background(.white, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.medBorder, lineWidth: 1.5))
            .opacity(isComingSoon ? 0.72 : 1)
        }
        .buttonStyle(.plain)
        .disabled(isComingSoon)
    }
}

struct RadiologyComingSoonSession: View {
    @Environment(PracticeSessionStore.self) private var practice

    var body: some View {
        NavigationStack {
            RadiologyComingSoonScreen(title: "Radiology is coming soon")
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Close", systemImage: "xmark") {
                            practice.activeSession = nil
                        }
                    }
                }
        }
    }
}

struct RadiologyComingSoonScreen: View {
    let title: String

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "viewfinder")
                .font(.system(size: 32, weight: .semibold))
                .foregroundStyle(.secondary)
                .frame(width: 64, height: 64)
                .background(Color.medPanel, in: RoundedRectangle(cornerRadius: 18))
                .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.medBorder, lineWidth: 1.5))

            VStack(spacing: 8) {
                Label("Coming Soon", systemImage: "clock")
                    .font(.instrument(size: 12, weight: .bold, relativeTo: .caption))
                    .textCase(.uppercase)
                    .foregroundStyle(.orange)

                Text(title)
                    .font(.instrument(size: 24, weight: .bold, relativeTo: .title2))
                    .foregroundStyle(Color.medInk)
                    .multilineTextAlignment(.center)

                Text("This release is focused on Cardiology ECG practice while X-Ray and CT modules are prepared for launch.")
                    .font(.instrument(size: 14, relativeTo: .body))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 320)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(24)
        .background(Color.medCanvas)
    }
}

struct StatTile: View {
    let title: String
    let value: String
    let symbol: String

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 10) {
                Image(systemName: symbol)
                    .foregroundStyle(.blue)
                Text(value)
                    .font(.instrument(size: 28, weight: .bold, relativeTo: .title))
                Text(title)
                    .font(.instrument(size: 12, relativeTo: .caption))
                    .foregroundStyle(.secondary)
            }
        }
    }
}

struct SessionTopBar: View {
    let title: String
    let onExit: () -> Void

    var body: some View {
        HStack {
            Label(title, systemImage: "stethoscope")
                .font(.instrument(size: 14, weight: .semibold))
            Spacer()
            Button("Exit", systemImage: "xmark", action: onExit)
                .buttonStyle(MedLabChinButtonStyle(kind: .secondary, height: 34, horizontalPadding: 12))
        }
        .padding(.horizontal)
        .frame(height: 56)
        .background(.white)
        .overlay(alignment: .bottom) { Divider() }
    }
}

extension View {
    func medLabField() -> some View {
        padding(12)
            .background(.white, in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.medBorder, lineWidth: 1.5))
    }
}

extension Font {
    static func instrument(size: Double, weight: Font.Weight = .regular, relativeTo textStyle: Font.TextStyle = .body) -> Font {
        Font.custom("InstrumentSans-Regular", size: size, relativeTo: textStyle).weight(weight)
    }
}

extension Color {
    static let medCanvas = Color(red: 0.972, green: 0.968, blue: 0.945)
    static let medPanel = Color(red: 0.956, green: 0.953, blue: 0.925)
    static let medInk = Color(red: 0.055, green: 0.059, blue: 0.071)
    static let medMuted = Color(red: 0.420, green: 0.416, blue: 0.396)
    static let medSoft = Color(red: 0.608, green: 0.604, blue: 0.580)
    static let medBorder = Color(red: 0.910, green: 0.902, blue: 0.875)
    static let medBorderStrong = Color(red: 0.847, green: 0.835, blue: 0.800)
    static let medBlue = Color(red: 0.000, green: 0.400, blue: 1.000)
    static let medBlueDark = Color(red: 0.000, green: 0.278, blue: 0.800)
    static let medBlueSoft = Color(red: 0.933, green: 0.953, blue: 1.000)
    static let medBlueBorder = Color(red: 0.780, green: 0.851, blue: 1.000)
}

func greeting(date: Date = .now) -> String {
    let hour = Calendar.current.component(.hour, from: date)
    if hour < 12 { return "Good morning" }
    if hour < 17 { return "Good afternoon" }
    return "Good evening"
}
