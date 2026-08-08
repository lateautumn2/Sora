import { Save } from "lucide-react";

import { FriendDeleteButton } from "@/components/admin/friend-delete-button";
import { FriendLogo } from "@/components/friend-logo";
import { PostPagination } from "@/components/site/post-pagination";
import { resolvePage, resolveTotalPages } from "@/lib/content/pagination";
import { countFriendLinks, listAdminFriendLinks } from "@/lib/friends/service";

import { deleteFriendLinkAction, saveFriendLinkAction } from "./actions";

const PAGE_SIZE = 10;

const notices: Record<string, string> = {
  saved: "友链已保存",
  deleted: "友链已删除",
  invalid: "友链信息格式不正确，请检查后重试",
  duplicate: "该友链地址已存在",
};

export default async function AdminFriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; page?: string }>;
}) {
  const query = await searchParams;
  const total = countFriendLinks();
  const totalPages = resolveTotalPages(total, PAGE_SIZE);
  const page = totalPages > 0 ? Math.min(resolvePage(query.page), totalPages) : 1;
  const friends = listAdminFriendLinks(PAGE_SIZE, (page - 1) * PAGE_SIZE);

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>友链</h1>
          <p>维护站点推荐链接，控制展示顺序与公开状态。</p>
        </div>
        <span className="admin-page-badge">共 {total} 条记录</span>
      </header>

      {query.notice && notices[query.notice] ? (
        <p className="admin-notice mt-5" role="status">
          {notices[query.notice]}
        </p>
      ) : null}

      <section aria-labelledby="new-friend" className="admin-panel mt-6">
        <div className="admin-panel-header">
          <div>
            <h2 id="new-friend">新建友链</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">填写名称、链接和展示信息。</p>
          </div>
          <span className="admin-section-index">01</span>
        </div>
        <form action={saveFriendLinkAction} className="admin-friend-create-form mt-5">
          <input name="page" type="hidden" value={page} />
          <label className="admin-field">
            <span>名称</span>
            <input aria-label="友链名称" className="form-input" name="name" required />
          </label>
          <label className="admin-field">
            <span>网址</span>
            <input aria-label="友链网址" className="form-input" name="url" required type="url" />
          </label>
          <label className="admin-field">
            <span>Logo 地址</span>
            <input
              aria-label="友链 Logo 地址"
              className="form-input"
              inputMode="url"
              name="logoUrl"
              type="text"
            />
          </label>
          <label className="admin-field">
            <span>描述</span>
            <input aria-label="友链描述" className="form-input" name="description" />
          </label>
          <label className="admin-field">
            <span>顺序</span>
            <input
              aria-label="友链顺序"
              className="form-input"
              defaultValue="0"
              max="999"
              min="0"
              name="sortOrder"
              type="number"
            />
          </label>
          <label className="admin-friend-enabled">
            <input defaultChecked name="enabled" type="checkbox" />
            启用
          </label>
          <button
            aria-label="保存新友链"
            className="icon-button self-end"
            title="保存"
            type="submit"
          >
            <Save aria-hidden="true" size={16} />
          </button>
        </form>
      </section>

      <section aria-labelledby="friend-list" className="admin-panel mt-6">
        <div className="admin-panel-header">
          <div>
            <h2 id="friend-list">已有友链</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">可直接编辑每条友链的展示信息。</p>
          </div>
          <span className="admin-section-index">02</span>
        </div>
        {friends.length === 0 ? (
          <div className="admin-empty mt-5">暂无友链</div>
        ) : (
          <div className="admin-list mt-5">
            {friends.map((friend) => (
              <div className="admin-friend-row" key={friend.id}>
                <form action={saveFriendLinkAction} className="admin-friend-edit-form">
                  <input name="id" type="hidden" value={friend.id} />
                  <input name="page" type="hidden" value={page} />
                  <FriendLogo logoUrl={friend.logoUrl} name={friend.name} />
                  <label className="admin-field">
                    <span>名称</span>
                    <input
                      aria-label={`${friend.name}名称`}
                      className="form-input"
                      defaultValue={friend.name}
                      name="name"
                      required
                    />
                  </label>
                  <label className="admin-field">
                    <span>网址</span>
                    <input
                      aria-label={`${friend.name}网址`}
                      className="form-input"
                      defaultValue={friend.url}
                      name="url"
                      required
                      type="url"
                    />
                  </label>
                  <label className="admin-field">
                    <span>Logo 地址</span>
                    <input
                      aria-label={`${friend.name} Logo 地址`}
                      className="form-input"
                      defaultValue={friend.logoUrl}
                      inputMode="url"
                      name="logoUrl"
                      type="text"
                    />
                  </label>
                  <label className="admin-field">
                    <span>描述</span>
                    <input
                      aria-label={`${friend.name}描述`}
                      className="form-input"
                      defaultValue={friend.description}
                      name="description"
                    />
                  </label>
                  <label className="admin-field">
                    <span>顺序</span>
                    <input
                      aria-label={`${friend.name}顺序`}
                      className="form-input"
                      defaultValue={friend.sortOrder}
                      max="999"
                      min="0"
                      name="sortOrder"
                      type="number"
                    />
                  </label>
                  <label className="admin-friend-enabled">
                    <input defaultChecked={friend.enabled} name="enabled" type="checkbox" />
                    启用
                  </label>
                  <button
                    aria-label={`保存${friend.name}`}
                    className="icon-button self-end"
                    title="保存"
                    type="submit"
                  >
                    <Save aria-hidden="true" size={16} />
                  </button>
                </form>
                <form action={deleteFriendLinkAction} className="admin-friend-delete-form">
                  <input name="id" type="hidden" value={friend.id} />
                  <input name="page" type="hidden" value={page} />
                  <FriendDeleteButton name={friend.name} />
                </form>
              </div>
            ))}
          </div>
        )}
        <PostPagination
          basePath="/admin/friends"
          className="admin-pagination mt-5"
          page={page}
          totalPages={totalPages}
        />
      </section>
    </div>
  );
}
