import type { FastifyInstance } from "fastify";
import { requireAdminPermission } from "../../lib/security";
import {
  createAdminMenu,
  createAdminRole,
  createAdminUser,
  deleteAdminMenu,
  deleteAdminRole,
  deleteAdminUser,
  listAdminMenus,
  listAdminRoles,
  listAdminUsers,
  updateAdminMenu,
  updateAdminRole,
  updateAdminUser,
} from "./repository";
import {
  createAdminMenuSchema,
  createAdminRoleSchema,
  createAdminUserSchema,
} from "./types";

/**
 * 注册后台菜单、角色与用户管理路由。
 *
 * @param {FastifyInstance} app Fastify 应用实例。
 * @returns {Promise<void>} 路由注册完成后的 Promise。
 */
export async function registerAdminAccessRoutes(app: FastifyInstance) {
  /**
   * 返回后台菜单树。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ items: Awaited<ReturnType<typeof listAdminMenus>> } | void>} 菜单列表或提前结束。
   */
  app.get("/admin/menus", async (request, reply) => {
    if (!requireAdminPermission(request, reply, "access.menus.view")) {
      return;
    }

    return {
      items: await listAdminMenus(),
    };
  });

  /**
   * 创建后台菜单。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<import('fastify').FastifyReply | void>} 创建响应或提前结束。
   */
  app.post("/admin/menus", async (request, reply) => {
    if (!requireAdminPermission(request, reply, "access.menus.create")) {
      return;
    }

    const input = createAdminMenuSchema.parse(request.body);
    const item = await createAdminMenu(input);
    return reply.code(201).send({ item });
  });

  /**
   * 更新后台菜单；找不到时返回 404。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ item: Awaited<ReturnType<typeof updateAdminMenu>> } | import('fastify').FastifyReply | void>} 更新结果、错误响应或提前结束。
   */
  app.put("/admin/menus/:menuId", async (request, reply) => {
    if (!requireAdminPermission(request, reply, "access.menus.edit")) {
      return;
    }

    const menuId = Number((request.params as { menuId: string }).menuId);
    const input = createAdminMenuSchema.parse(request.body);
    const item = await updateAdminMenu(menuId, input);

    if (!item) {
      return reply.code(404).send({ message: "MENU_NOT_FOUND" });
    }

    return { item };
  });

  /**
   * 删除后台菜单；找不到时返回 404。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ success: true } | import('fastify').FastifyReply | void>} 删除结果、错误响应或提前结束。
   */
  app.delete("/admin/menus/:menuId", async (request, reply) => {
    if (!requireAdminPermission(request, reply, "access.menus.delete")) {
      return;
    }

    const menuId = Number((request.params as { menuId: string }).menuId);
    const success = await deleteAdminMenu(menuId);

    if (!success) {
      return reply.code(404).send({ message: "MENU_NOT_FOUND" });
    }

    return { success: true };
  });

  /**
   * 返回后台角色列表。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ items: Awaited<ReturnType<typeof listAdminRoles>> } | void>} 角色列表或提前结束。
   */
  app.get("/admin/roles", async (request, reply) => {
    if (!requireAdminPermission(request, reply, "access.roles.view")) {
      return;
    }

    return {
      items: await listAdminRoles(),
    };
  });

  /**
   * 创建后台角色。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<import('fastify').FastifyReply | void>} 创建响应或提前结束。
   */
  app.post("/admin/roles", async (request, reply) => {
    if (!requireAdminPermission(request, reply, "access.roles.create")) {
      return;
    }

    const input = createAdminRoleSchema.parse(request.body);
    const item = await createAdminRole(input);
    return reply.code(201).send({ item });
  });

  /**
   * 更新后台角色；找不到时返回 404。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ item: Awaited<ReturnType<typeof updateAdminRole>> } | import('fastify').FastifyReply | void>} 更新结果、错误响应或提前结束。
   */
  app.put("/admin/roles/:roleId", async (request, reply) => {
    if (!requireAdminPermission(request, reply, "access.roles.edit")) {
      return;
    }

    const roleId = Number((request.params as { roleId: string }).roleId);
    const input = createAdminRoleSchema.parse(request.body);
    const item = await updateAdminRole(roleId, input);

    if (!item) {
      return reply.code(404).send({ message: "ROLE_NOT_FOUND" });
    }

    return { item };
  });

  /**
   * 删除后台角色；找不到时返回 404。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ success: true } | import('fastify').FastifyReply | void>} 删除结果、错误响应或提前结束。
   */
  app.delete("/admin/roles/:roleId", async (request, reply) => {
    if (!requireAdminPermission(request, reply, "access.roles.delete")) {
      return;
    }

    const roleId = Number((request.params as { roleId: string }).roleId);
    const success = await deleteAdminRole(roleId);

    if (!success) {
      return reply.code(404).send({ message: "ROLE_NOT_FOUND" });
    }

    return { success: true };
  });

  /**
   * 返回后台用户列表。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ items: Awaited<ReturnType<typeof listAdminUsers>> } | void>} 用户列表或提前结束。
   */
  app.get("/admin/users", async (request, reply) => {
    if (!requireAdminPermission(request, reply, "access.users.view")) {
      return;
    }

    return {
      items: await listAdminUsers(),
    };
  });

  /**
   * 创建后台用户。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<import('fastify').FastifyReply | void>} 创建响应或提前结束。
   */
  app.post("/admin/users", async (request, reply) => {
    if (!requireAdminPermission(request, reply, "access.users.create")) {
      return;
    }

    const input = createAdminUserSchema.parse(request.body);
    const item = await createAdminUser(input);
    return reply.code(201).send({ item });
  });

  /**
   * 更新后台用户；找不到时返回 404。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ item: Awaited<ReturnType<typeof updateAdminUser>> } | import('fastify').FastifyReply | void>} 更新结果、错误响应或提前结束。
   */
  app.put("/admin/users/:userId", async (request, reply) => {
    if (!requireAdminPermission(request, reply, "access.users.edit")) {
      return;
    }

    const userId = Number((request.params as { userId: string }).userId);
    const input = createAdminUserSchema.parse(request.body);
    const item = await updateAdminUser(userId, input);

    if (!item) {
      return reply.code(404).send({ message: "ADMIN_USER_NOT_FOUND" });
    }

    return { item };
  });

  /**
   * 删除后台用户；找不到时返回 404。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ success: true } | import('fastify').FastifyReply | void>} 删除结果、错误响应或提前结束。
   */
  app.delete("/admin/users/:userId", async (request, reply) => {
    if (!requireAdminPermission(request, reply, "access.users.delete")) {
      return;
    }

    const userId = Number((request.params as { userId: string }).userId);
    const success = await deleteAdminUser(userId);

    if (!success) {
      return reply.code(404).send({ message: "ADMIN_USER_NOT_FOUND" });
    }

    return { success: true };
  });
}
