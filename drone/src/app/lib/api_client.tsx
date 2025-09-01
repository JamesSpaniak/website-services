import { UserDto } from "./data/profile";
import { CourseData } from "./data/units";

const BASE_URL: String = "http://localhost:3000"

async function make_http_call(endpoint: string, httpMethod: string, httpHeaders?: Record<string, string>, bodyStr?: string): Promise<any> {
  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      method: httpMethod,
      headers: httpHeaders,
      body: bodyStr,
    }); // TODO Add CORS

    if (!response.ok) {
        console.log(`RESPONSE=${response}`);
      throw new Error(`HTTP_ERROR_CODE=${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error; // Re-throw to handle in the calling function
  }
}

async function login(userName: string, password: String): Promise<string> { // Adjust 'any[]' to your article data type
    let queryParams = `username=${userName}&password=${password}`
    let data: LoginResponse = await make_http_call(`auth/login?${queryParams}`, 'POST');
    return data.access_token;
}

async function getArticles(token: string): Promise<any | Error> { // Adjust 'any[]' to your article data type
    try {
        const headers = {
            authorization: `Bearer ${token}`
        }
        let data = await make_http_call('articles', 'GET', headers); // TODO
        return data;
    } catch (error) {
        console.error('Operation failed:', error);
        return new Error("Courses API Call Failed.");
    }
}

async function getCourses(token: string): Promise<CourseData[] | Error> { // Adjust 'any[]' to your article data type
    try {
        const headers = {
            authorization: `Bearer ${token}`
        }
        let data = await make_http_call('courses', 'GET', headers);
        console.log(data);
        return data;
    } catch (error) {
        console.error('Operation failed:', error);
        return new Error("Courses API Call Failed.");
    }
}

async function getCourse(id: string, token: string): Promise<CourseData | Error> {
    try {
        const headers = {
            authorization: `Bearer ${token}`
        }
        // Assuming an endpoint like /courses/:id
        let data = await make_http_call(`courses/${id}`, 'GET', headers);
        console.log(data);
        return data;
    } catch (error) {
        console.error('Operation failed:', error);
        return new Error("Course API Call Failed.");
    }
}

async function getUser(username: string, token: string): Promise<UserDto | Error> {
    try {
        const headers = {
            authorization: `Bearer ${token}`
        }
        let data = await make_http_call(`users/${username}`, 'GET', headers);
        console.log(data);
        return data;
    } catch (error) {
        console.error('Operation failed:', error);
        return new Error("Users API Call Failed.");
    }
}

interface LoginResponse {
    access_token: string;
    // Other properties like refresh_token, expires_in, etc. if provided
}

export {
    getArticles,
    getCourses,
    getCourse,
    getUser,
    login
}