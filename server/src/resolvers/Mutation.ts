import bcrypt from "bcrypt";
import {
  Prisma,
  UserCreateInput,
  UserUpdateInput
} from "../generated/prisma-client";
import moment from "moment";
import { transport } from "../util";

// Defining the context interface
interface IContext {
  prisma: Prisma;
  user: { id: string }; // TODO user interface
}

// Defining user update interface
interface IUserUpdate extends UserUpdateInput {
  newPassword?: string;
}

/**
 * The main Mutation object
 */
const Mutation = {
  /**
   * Register a new user
   *
   * @param root root
   * @param args arguments
   * @param ctx context
   *
   * Return the success message
   */
  async signup(root: any, args: UserCreateInput, ctx: IContext) {
    // Transform email address to lowercase.
    args.email = args.email.toLowerCase();

    // Check if the submitted email for registering already exists.
    if (await ctx.prisma.user({ email: args.email })) {
      throw new Error("Email address already exists.");
    }

    // Hash password before stored in the database.
    const password = await bcrypt.hash(args.password, 10);

    await ctx.prisma.createUser({
      cell: args.cell,
      email: args.email,
      image: args.image,
      name: args.name,
      streetAddress: args.streetAddress,
      password
    });

    return { message: "Registered successfully" };
  },

  /**
   * Updates the user information
   *
   * @param root parent
   * @param args arguments
   * @param ctx context
   *
   * Return the success message
   */
  async updateUser(root: any, args: IUserUpdate, ctx: IContext) {
    // Check if the user is logged in
    if (!ctx.user) {
      throw new Error("You must be logged in to update user information.");
    }

    // Logged in user information
    const user = await ctx.prisma.user({ id: ctx.user.id });

    // Check if the user password is corrct
    if (user && !(await bcrypt.compare(args.password, user.password))) {
      throw new Error("Please provide a correct user password");
    }

    // An object holding arguments to update
    const userToUpdate: IUserUpdate = {};

    // If user name is to change
    if (args.name) {
      userToUpdate.name = args.name;
    }

    // If user email is to change
    if (user && args.email && args.email !== user.email) {
      // Transform email address to lowercase.
      args.email = args.email.toLowerCase();

      // Check if the submitted email for registering already exists.
      if (await ctx.prisma.user({ email: args.email })) {
        throw new Error("Email address already exists.");
      }

      userToUpdate.email = args.email;
    }

    // If user password is to change
    if (args.newPassword) {
      // Hash password before stored in the database.
      const password = await bcrypt.hash(args.newPassword, 10);

      userToUpdate.password = password;
    }

    // If user contact is to change
    if (args.cell) {
      userToUpdate.cell = args.cell;
    }

    // If user profile image is to change
    if (args.image) {
      userToUpdate.image = args.image;
    }

    // If user street address is to change
    if (args.streetAddress) {
      userToUpdate.streetAddress = args.streetAddress;
    }

    await ctx.prisma.updateUser({
      where: {
        id: ctx.user.id
      },
      data: userToUpdate
    });

    return { message: "Updated successfully" };
  },

  /**
   * Make a booking for a specific slot
   *
   * @param root parent
   * @param args arguments
   * @param ctx context
   *
   * Return a success message
   */
  async book(root: any, args: any, ctx: IContext) {
    // Check if the user is logged in
    if (!ctx.user) {
      return null;
    }

    // Update the status of the slot to book
    await ctx.prisma.updateSlot({
      where: {
        id: args.slotId
      },
      data: {
        status: "INACTIVE"
      }
    });

    await ctx.prisma.createBooking({
      status: "BOOKED",
      slot: {
        connect: {
          id: args.slotId
        }
      },
      user: {
        connect: {
          id: ctx.user.id
        }
      }
    });

    return { message: "Booked successfully" };
  },

  /**
   * Cancel the specific booking
   *
   * @param root parent
   * @param args arguments
   * @param ctx context
   *
   * Return the success message
   */
  async cancelBooking(root: any, args: any, ctx: IContext) {
    // Check if the user is logged in
    if (!ctx.user) {
      return null;
    }

    // Update the status of the booking to cancel
    const bookingToCancel = await ctx.prisma.updateBooking({
      where: {
        id: args.bookingId
      },
      data: {
        status: "CANCELLED"
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

    const slotId = (bookingToCancel as any).slot.id;

    // Update the slot to be avtive
    await ctx.prisma.updateSlot({
      where: {
        id: slotId
      },
      data: {
        status: "ACTIVE"
      }
    });

    return { message: "Cancelled booking successfully" };
  },

  /**
   * Request to reset the password
   *
   * @param root parent
   * @param args arguments
   * @param ctx context
   *
   * Return the success message
   */
  async requestReset(root: any, args: any, ctx: IContext) {
    // Transform email address to lowercase.
    args.email = args.email.toLowerCase();

    // Check if this is a real user
    const user = await ctx.prisma.user({ email: args.email });

    if (!user) {
      throw new Error(`No such user found for email ${args.email}`);
    }

    // Set a reset one time pin and expiry on that user
    const oneTimePin = (Math.random() * 10000).toFixed();

    const resetTokenExpiry = moment(Date.now())
      .add(1, "hours")
      .toDate();

    await ctx.prisma.updateUser({
      where: { email: args.email },
      data: { oneTimePin, resetTokenExpiry }
    });

    try {
      const html = `
            Dear Valuable Client,<br><br>
            Someone (probably you) has requested to reset your password for the Soso-The-Barber app.<br><br>
            Please use the OTP below to change the password:<br><br>
            OTP: ${oneTimePin}<br><br>
            If you have not requested to reset your password there is no need for any action from your side.<br><br>
            Kind Regards,<br><br>
            Soso-The-Barber
       `;

      const email = {
        from: "sosothebarber@gmail.com",
        to: user.email,
        subject: "Reset your password for the Soso-The-barber",
        html
      };

      await transport.sendMail(email);
    } catch (e) {
      throw new Error(
        `The email with the password reset token could not be sent to ${
          user.email
        }.`
      );
    }

    return { message: "Requested password change successfully" };
  },

  /**
   * Reset the password
   *
   * @param root parent
   * @param args arguments
   * @param ctx context
   *
   * Returns the success message
   */
  async resetPassword(root: any, args: any, ctx: IContext) {
    // Check if its a legit one time pin
    // And check if the one time pin is not expired
    const [user] = await ctx.prisma.users({
      where: {
        oneTimePin: args.oneTimePin,
        resetTokenExpiry_gte: moment(Date.now()).toDate()
      }
    });

    if (!user) {
      throw new Error(
        "This one time pin is either invalid or expired. \nPlease re-request another one"
      );
    }

    // Hash the new password
    const password = await bcrypt.hash(args.password, 10);

    // Save the new password to the user and remove old one time pin fields
    await ctx.prisma.updateUser({
      where: {
        email: user.email
      },
      data: {
        password,
        oneTimePin: "",
        resetTokenExpiry: moment(Date.now()).toDate()
      }
    });

    return { message: "Password changed successfully" };
  }
};

export { Mutation };
