import { Prisma } from "../generated/prisma-client";

// Defining the context interface
interface IContext {
  prisma: Prisma;
  user: { id: string }; // TODO user interface
}

/**
 * The main Query object
 */
const Query = {
  /**
   * The user query
   *
   * @param root parent
   * @param args arguments
   * @param ctx context
   *
   * Returns the user information
   */
  user(root: any, args: {}, ctx: IContext) {
    // Check if the user logged in
    if (!ctx.user) {
      return null;
    }

    return ctx.prisma.user({
      id: ctx.user.id
    }).$fragment(`{
      id 
      email
      image
      name
      role
      streetAddress
      bookings{
        id
        status
        slot{ 
          id 
          time 
          day
          status
        } 
      }
    }`);
  },

  /**
   * The users query
   *
   * @param root parent
   * @param args arguments
   * @param ctx context
   *
   * Returns the list of users information
   */
  async users(root: any, args: any, ctx: { prisma: Prisma }) {
    return await ctx.prisma.users({
      orderBy: "createdAt_DESC"
    }).$fragment(`{
      id 
      email
      image
      name
      role
      streetAddress
      bookings{
        id
        status
        slot{ 
          id 
          time 
          day
          status
        } 
        user{ 
          id 
          email 
          image
          role
          streetAddress
        }
      }
    }`);
  },

  /**
   * The slots query
   *
   * @param root parent
   * @param args arguments
   * @param ctx context
   *
   * Returns the list of slots information
   */
  async slots(root: any, args: any, ctx: { prisma: Prisma }) {
    return await ctx.prisma.slots({
      where: {
        status: "ACTIVE"
      }
    });
  },

  /**
   * The bookings query
   *
   * @param root parent
   * @param args arguments
   * @param ctx context
   *
   * Returns the list of bookings information
   */
  async bookings(root: any, args: any, ctx: { prisma: Prisma }) {
    return await ctx.prisma.bookings({
      where: {
        status: "BOOKED"
      }
    }).$fragment(`{
      id 
      status
      slot{ 
        id 
        time 
        day
        status
      } 
      user{ 
        id 
        email 
        image
        name
        role
        streetAddress
      }
    }`);
  },

  /**
   * The gallery query
   *
   * @param root parent
   * @param args arguments
   * @param ctx context
   *
   * Returns the list of urls images for the gallery
   */
  async gallery(root: any, args: any, ctx: { prisma: Prisma }) {
    return await ctx.prisma.galleries();
  }
};

export { Query };
