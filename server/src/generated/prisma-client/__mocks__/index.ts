const prisma: any = jest.genMockFromModule('..');

// add required fields
prisma.user = jest.fn();
prisma.createUser =jest.fn();

export { prisma };