import { redirect } from 'next/navigation';

// import { SignUpCard } from '@/features/auth/components/sign-up-card';
// import { getCurrent } from '@/features/auth/queries';

const SignUpPage = async () => {
  // Bỏ tính năng đăng ký: tự động chuyển hướng về trang đăng nhập
  redirect('/sign-in');

  // const user = await getCurrent();
  // if (user) redirect('/');
  // return <SignUpCard />;
};

export default SignUpPage;
