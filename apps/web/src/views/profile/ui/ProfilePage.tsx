import { ProfileForm } from "@/features/edit-profile";

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold">내 정보</h1>
      <p className="mb-6 text-sm text-zinc-500">로그인 계정 프로필</p>
      <ProfileForm />
    </div>
  );
}
