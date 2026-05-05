import { getProjects, createProject } from '@/actions/admin'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { PlusCircle, Settings, Play } from 'lucide-react'

export default async function AdminDashboard() {
  const projects = await getProjects()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-gray-500 mt-1">Manage your listening test experiments here.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-dashed border-2 flex flex-col justify-center items-center h-[250px] text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-colors bg-gray-50/50">
          <form action={createProject} className="w-full h-full flex flex-col p-6">
            <div className="flex-1 flex flex-col space-y-4">
              <h3 className="font-semibold text-lg text-gray-900">Create New Project</h3>
              <div className="space-y-2">
                <Label htmlFor="title" className="sr-only">Title</Label>
                <Input id="title" name="title" placeholder="Project Title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="sr-only">Description</Label>
                <Input id="description" name="description" placeholder="Short description (optional)" />
              </div>
            </div>
            <Button type="submit" className="w-full mt-4" variant="secondary">
              <PlusCircle className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </form>
        </Card>

        {projects.map((project) => (
          <Card key={project.id} className="flex flex-col h-[250px] shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex-1">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl line-clamp-1">{project.title}</CardTitle>
                {project.is_published ? (
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    Published
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                    Draft
                  </span>
                )}
              </div>
              <CardDescription className="line-clamp-2 mt-2">
                {project.description || 'No description provided.'}
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex gap-2 pt-4 border-t bg-gray-50/50">
              <Link href={`/admin/projects/${project.id}`} className="flex-1">
                <Button variant="default" className="w-full">
                  <Settings className="w-4 h-4 mr-2" /> Manage
                </Button>
              </Link>
              {project.is_published && (
                <Link href={`/survey/${project.id}`}>
                  <Button variant="outline" title="Open Survey">
                    <Play className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
