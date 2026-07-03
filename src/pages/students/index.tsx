import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Student } from '@/types/database';
import { 
  Search, Plus, Download, Eye, Edit, Trash2, Filter
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function StudentsOverview() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_STUDENTS as Student[];
      const { data, error } = await supabase.from('students').select('*').order('roll_no');
      if (error) throw error;
      return data as Student[];
    },
  });

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      student.roll_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = classFilter === 'all' || student.class === classFilter;
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    return matchesSearch && matchesClass && matchesStatus;
  });

  // Stats
  const total = students.length;
  const active = students.filter(s => s.status === 'Active').length;
  const onLeave = students.filter(s => s.status === 'On Leave').length;

  const StatusBadge = ({ status }: { status: string | null }) => {
    const colors: Record<string, string> = {
      'Active': 'bg-green-100 text-green-700',
      'Inactive': 'bg-red-100 text-red-700',
      'On Leave': 'bg-amber-100 text-amber-700',
    };
    const colorClass = status && colors[status] ? colors[status] : 'bg-gray-100 text-gray-700';
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {status || 'Unknown'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Students</h2>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button asChild>
            <Link to="/students/new">
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 flex flex-col justify-center">
          <p className="text-sm font-medium text-muted-foreground">Total Students</p>
          <p className="text-2xl font-bold mt-1">{total}</p>
        </Card>
        <Card className="p-4 flex flex-col justify-center">
          <p className="text-sm font-medium text-muted-foreground">Active</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{active}</p>
        </Card>
        <Card className="p-4 flex flex-col justify-center">
          <p className="text-sm font-medium text-muted-foreground">On Leave</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{onLeave}</p>
        </Card>
        <Card className="p-4 flex flex-col justify-center">
          <p className="text-sm font-medium text-muted-foreground">Inactive</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{total - active - onLeave}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border bg-white flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or roll no..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-gray-50/50"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto ml-auto">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[120px] bg-white">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="0">0</SelectItem>
                <SelectItem value="NUR">NUR</SelectItem>
                <SelectItem value="LKG">LKG</SelectItem>
                <SelectItem value="HKG">HKG</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="On Leave">On Leave</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 border-b border-border">
              <tr>
                <th className="px-6 py-3 font-medium">Roll No</th>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Class</th>
                <th className="px-6 py-3 font-medium">Group</th>
                <th className="px-6 py-3 font-medium">Gender</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Loading students...</td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No students found matching your filters.</td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b border-border hover:bg-gray-50/50 transition-colors last:border-0">
                    <td className="px-6 py-4 font-medium text-foreground">{student.roll_no}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{student.full_name}</div>
                      {student.father_name && <div className="text-xs text-muted-foreground mt-0.5">{student.father_name}</div>}
                    </td>
                    <td className="px-6 py-4">{student.class}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">{student.group}</span>
                    </td>
                    <td className="px-6 py-4">{student.gender || '-'}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={student.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => navigate(`/students/${student.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const MOCK_STUDENTS: Partial<Student>[] = [
  { id: '1', roll_no: 'SPS001', full_name: 'Aarav Sharma', class: 'LKG', group: 'BEG', status: 'Active', gender: 'Male', father_name: 'Ramesh Sharma' },
  { id: '2', roll_no: 'SPS002', full_name: 'Diya Patel', class: 'HKG', group: 'ADV', status: 'Active', gender: 'Female', father_name: 'Suresh Patel' },
  { id: '3', roll_no: 'SPS003', full_name: 'Vihaan Singh', class: 'NUR', group: 'BEG', status: 'Active', gender: 'Male', father_name: 'Vikram Singh' },
  { id: '4', roll_no: 'SPS004', full_name: 'Ananya Gupta', class: '1', group: 'ADV', status: 'On Leave', gender: 'Female', father_name: 'Amit Gupta' },
  { id: '5', roll_no: 'SPS005', full_name: 'Arjun Kumar', class: '2', group: 'ADV', status: 'Active', gender: 'Male', father_name: 'Rajesh Kumar' },
  { id: '6', roll_no: 'SPS006', full_name: 'Priya Desai', class: '0', group: 'BEG', status: 'Inactive', gender: 'Female', father_name: 'Mohan Desai' },
];
