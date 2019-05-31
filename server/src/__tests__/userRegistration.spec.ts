jest.mock("../generated/prisma-client");

import bcrypt from "bcrypt";
import request from "supertest";
import createServer from "../createServer";
import { prisma, UserWhereInput } from "../generated/prisma-client";

beforeAll(() => {
  interface IUserCreateInput {
    cell: string, 
    email: string, 
    password: string
  }

  // Mocking the user query
  (prisma.user as any).mockImplementation(async (where: UserWhereInput) => {
    if (where.email === "test@gmail.com") {
      return ({
        id: "1",
        cell: "0781406431",
        email: "test@gmail.com",
        password: bcrypt.hash("test", 10)
      })
    }
  });

  // Mocking the createUser mutation
  (prisma.createUser as any).mockImplementation(async (data: IUserCreateInput) => ({
    id: `${data.email}10111`,
    cell: data.cell,
    email: data.email,
    password: data.password
  }));
});

afterAll(() => {
  // Cleaning up
  (prisma.user as any).mockReset();
  (prisma.createUser as any).mockReset();
});

describe('Success user registering', () => {
  it('should register the user', async () => {
    const server = (await createServer()).createHttpServer({});
    const agent = request.agent(server);
    // Register user
    let response = await agent
      .post('/')
      .send({
        query: `
          mutation{
            signup(
              cell: "0781406431"
              email: "test1@gmail.com"
              password: "test1"
            ){ 
              id
              email
            }
          } 
        `
      }); 

    // Expect the user to be registered.
    expect(JSON.parse(response.text).data.signup.email).toBe('test1@gmail.com');

    // Expect the user to be assigned a unique ID when registered.
    expect(JSON.parse(response.text).data.signup.id).toBe('test1@gmail.com10111');

  })
});

describe('Failed user registering', () => {
  it('should not register the user with exixting email address', async () => {
    const server = (await createServer()).createHttpServer({});
    const agent = request.agent(server);
    // Register user
    let response = await agent
      .post('/')
      .send({
        query: `
          mutation{
            signup(
              cell: "0781406431"
              email: "test@gmail.com"
              password: "test3"
            ){ 
              id
              email
            }
          } 
        `
      }); 

    // Expect the error message to be meaningful.
    expect(response.text).toContain('Email address already exists.');
  })
});