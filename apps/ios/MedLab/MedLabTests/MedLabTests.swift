import XCTest
@testable import MedLab

final class MedLabTests: XCTestCase {
    func testGreetingBoundaries() {
        var components = DateComponents()
        components.calendar = Calendar(identifier: .gregorian)
        components.year = 2026
        components.month = 6
        components.day = 19

        components.hour = 8
        XCTAssertEqual(greeting(date: components.date!), "Good morning")

        components.hour = 14
        XCTAssertEqual(greeting(date: components.date!), "Good afternoon")

        components.hour = 20
        XCTAssertEqual(greeting(date: components.date!), "Good evening")
    }

    func testECGContextContainsCoreFields() {
        let params = ECGParams(
            heartRate: 88,
            rhythm: "normal",
            stElevation: true,
            stDepression: false,
            leftAxis: false,
            rightAxis: true
        )

        XCTAssertTrue(params.jsonContext.contains("\"heartRate\":88"))
        XCTAssertTrue(params.jsonContext.contains("\"rhythm\":\"normal\""))
        XCTAssertTrue(params.jsonContext.contains("\"rightAxis\":true"))
    }

    func testAppTabsMatchStudentV1Scope() {
        XCTAssertEqual(AppTab.allCases.map(\.title), ["Learn", "Practice", "Profile"])
    }
}
