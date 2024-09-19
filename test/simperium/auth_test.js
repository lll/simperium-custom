import buildAuth from "../../src/simperium/auth";
import https from "https";
import { equal } from "assert";
import { EventEmitter } from "events";

const originalRequest = https.request;
const stub = (respond) => {
  https.request = (url, options, handler) => {
    const req = new EventEmitter();
    req.end = (body) => respond(body, handler);
    return req;
  };
};

const stubResponse = (data) =>
  stub((body, handler) => {
    const response = new EventEmitter();
    handler(response);
    response.emit("data", data);
    response.emit("end");
  });

describe("Auth", () => {
  let auth;

  after(() => {
    // Unstub it
    https.request = originalRequest;
  });

  beforeEach(() => {
    auth = buildAuth("token", "secret", "url");
  });

  it("should request auth token", () => {
    stub((data, handler) => {
      const { username, password } = JSON.parse(data);
      const response = new EventEmitter();
      equal(username, "username");
      equal(password, "password");

      handler(response);
      response.emit("data", '{"access_token": "secret-token"}');
      response.emit("end");
    });

    return auth.authorize("username", "password").then((user) => {
      equal(user.access_token, "secret-token");
    });
  });

  it("should fail if missing access_token", () => {
    stubResponse('{"hello":"world"}');
    return auth.authorize("username", "password").catch((error) => {
      equal(error.message, "Failed to authenticate user.");
      equal(error.underlyingError.message, "access_token not present");
    });
  });

  it("should fail to auth with invalid credentials", () => {
    stubResponse("this is not json");

    return auth.authorize("username", "bad-password").catch((e) => {
      equal(e.message, "Failed to authenticate user.");
    });
  });

  it("should create an account with valid credentials", () => {
    stub((data, handler) => {
      const { username, password } = JSON.parse(data);
      const response = new EventEmitter();
      equal(username, "username");
      equal(password, "password");

      handler(response);
      response.emit("data", '{"access_token": "secret-token"}');
      response.emit("end");
    });

    return auth.create("username", "password").then((user) => {
      equal(user.access_token, "secret-token");
    });
  });

  it("should fail to create an account with invalid credentials", () => {
    stubResponse("this is not json");

    return auth.create("username", "bad-password").catch((e) => {
      equal(e.message, "Failed to authenticate user.");
    });
  });
});
