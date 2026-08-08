import { FriendLogo } from "@/components/friend-logo";
import { PageHeading } from "@/components/site/page-heading";
import { listPublicFriendLinks } from "@/lib/friends/service";

export const metadata = { title: "友链" };

export default async function FriendsPage() {
  const friends = listPublicFriendLinks().filter((friend) => friend.enabled);

  return (
    <section className="sora-friends-page">
      <PageHeading title="友链" />
      {friends.length === 0 ? (
        <p className="sora-friends-empty">暂无友链</p>
      ) : (
        <ul className="sora-friends-list">
          {friends.map((friend) => (
            <li key={friend.id}>
              <a
                className="sora-friend-link"
                href={friend.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                <FriendLogo logoUrl={friend.logoUrl} name={friend.name} />
                <span className="sora-friend-copy">
                  <span className="sora-friend-name">{friend.name}</span>
                  {friend.description ? (
                    <span className="sora-friend-description">{friend.description}</span>
                  ) : null}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
