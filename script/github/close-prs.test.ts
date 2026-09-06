import {describe, expect, test} from "bun:test"
import {validRetry} from "./close-prs-retry-helper"

//syntac and formatting sourced from https://oneuptime.com/blog/post/2026-01-31-bun-testing/view

//describe wfor grouping
describe("validRetry", ()=> {
    //individual tests
    test("yes retry for 403 response", ()=> {
        expect(validRetry(403, 1000, 0)).toBe(true)
    })

    test("yes retry for 429 response", ()=> {
        expect(validRetry(429, 1000, 0)).toBe(true)
    })

    test("yes retry for 500 or higher response", ()=> {
        expect(validRetry(500, 1000, 0)).toBe(true)
        expect(validRetry(503, 1000, 0)).toBe(true)

    })

    test("no retry for any other response type/number", ()=> {
        expect(validRetry(200, 1000, 0)).toBe(false)
        expect(validRetry(404, 1000, 0)).toBe(false)

    })


    test("no retry for zero delay", ()=> {
        expect(validRetry(403, 0, 0)).toBe(false)
    })


    test("no retry if maximum attempts reached", ()=> {
        expect(validRetry(403, 1000, 10)).toBe(false)
    })
})