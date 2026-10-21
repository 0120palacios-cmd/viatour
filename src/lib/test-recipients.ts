import "server-only";

// Internal addresses the owner approved for test emails (comma-separated TRAVEL_TEST_RECIPIENTS).
// Test sends go only to these, so a typo or a pasted customer address can never receive a test.
export function testRecipients() {
  return (process.env.TRAVEL_TEST_RECIPIENTS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}
