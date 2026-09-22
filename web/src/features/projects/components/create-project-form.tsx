'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CameraIcon, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { DottedSeparator } from '@/components/dotted-separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useCreateProject } from '@/features/projects/api/use-create-project';
import { createProjectSchema } from '@/features/projects/schema';
import { useWorkspaceId } from '@/features/workspaces/hooks/use-workspace-id';
import { cn } from '@/lib/utils';

interface CreateProjectFormProps {
  onCancel?: () => void;
}

export const CreateProjectForm = ({ onCancel }: CreateProjectFormProps) => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const inputRef = useRef<HTMLInputElement>(null);

  const { mutate: createProject, isPending } = useCreateProject();

  const createProjectForm = useForm<z.infer<typeof createProjectSchema>>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      image: undefined,
      workspaceId,
    },
  });

  const onSubmit = (values: z.infer<typeof createProjectSchema>) => {
    const finalValues = {
      ...values,
      image: values.image instanceof File ? values.image : '',
    };

    createProject(
      {
        form: finalValues,
      },
      {
        onSuccess: ({ data }) => {
          createProjectForm.reset();

          router.push(`/workspaces/${workspaceId}/projects/${data.$id}`);
        },
      },
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes;
    const file = e.target.files?.[0];

    if (file) {
      const validImageTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];

      if (!validImageTypes.includes(file.type) && !file.type.startsWith('image/')) {
        return toast.error('File is not a valid image.');
      }
      if (file.size > MAX_FILE_SIZE) {
        return toast.error('Image size cannot exceed 10 MB.');
      }

      createProjectForm.setValue('image', file, { shouldValidate: true, shouldDirty: true });
    }
  };

  return (
    <Card className="size-full border-none shadow-none">
      <CardHeader className="flex p-7">
        <CardTitle className="text-xl font-bold">Create a new project</CardTitle>
      </CardHeader>

      <div className="px-7">
        <DottedSeparator />
      </div>

      <CardContent className="p-7">
        <Form {...createProjectForm}>
          <form onSubmit={createProjectForm.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-y-4">
              <FormField
                disabled={isPending}
                control={createProjectForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>

                    <FormControl>
                      <Input {...field} type="text" placeholder="Enter project name" />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                disabled={isPending}
                control={createProjectForm.control}
                name="image"
                render={({ field }) => {
                  const previewUrl = field.value instanceof File ? URL.createObjectURL(field.value) : field.value;

                  return (
                    <div className="flex flex-col gap-y-2">
                      <div className="flex items-center gap-x-5">
                        <div
                          onClick={() => !isPending && inputRef.current?.click()}
                          className="group relative cursor-pointer"
                          title="Click to upload or change icon"
                        >
                          {previewUrl ? (
                            <div className="relative size-[72px] overflow-hidden rounded-md border border-neutral-200">
                              <Image src={previewUrl} alt="Project Logo" fill className="object-cover transition group-hover:opacity-75" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                                <CameraIcon className="size-5 text-white" />
                              </div>
                            </div>
                          ) : (
                            <Avatar className="size-[72px] border border-dashed border-neutral-300 transition group-hover:border-neutral-400">
                              <AvatarFallback className="bg-neutral-50 group-hover:bg-neutral-100">
                                <ImageIcon className="size-[36px] text-neutral-400 group-hover:text-neutral-600 transition" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>

                        <div className="flex flex-col">
                          <p className="text-sm font-medium">Project Icon</p>
                          <p className="text-xs text-muted-foreground">JPG, PNG, JPEG, or WEBP, max 10MB</p>

                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              handleImageChange(e);
                              if (e.target.files?.[0]) {
                                field.onChange(e.target.files[0]);
                              }
                            }}
                            accept="image/png, image/jpeg, image/jpg, image/webp, .png, .jpg, .jpeg, .webp"
                            ref={inputRef}
                            disabled={isPending}
                          />

                          <div className="mt-2 flex items-center gap-x-2">
                            {field.value ? (
                              <>
                                <Button
                                  type="button"
                                  disabled={isPending}
                                  variant="tertiary"
                                  size="xs"
                                  className="w-fit"
                                  onClick={() => inputRef.current?.click()}
                                >
                                  Change Image
                                </Button>
                                <Button
                                  type="button"
                                  disabled={isPending}
                                  variant="destructive"
                                  size="xs"
                                  className="w-fit"
                                  onClick={() => {
                                    field.onChange(null);
                                    createProjectForm.setValue('image', undefined, {
                                      shouldValidate: true,
                                      shouldDirty: true,
                                    });
                                    if (inputRef.current) inputRef.current.value = '';
                                  }}
                                >
                                  Remove Image
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                disabled={isPending}
                                variant="tertiary"
                                size="xs"
                                className="w-fit"
                                onClick={() => inputRef.current?.click()}
                              >
                                Upload Image
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <FormMessage />
                    </div>
                  );
                }}
              />
            </div>

            <DottedSeparator className="py-7" />

            <div className="flex items-center justify-between">
              <Button
                disabled={isPending}
                type="button"
                size="lg"
                variant="secondary"
                onClick={onCancel}
                className={cn(!onCancel && 'invisible')}
              >
                Cancel
              </Button>

              <Button disabled={isPending} type="submit" size="lg">
                Create Project
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
