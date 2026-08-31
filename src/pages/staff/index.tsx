import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Staff } from '@/types/database';
import { Search, Plus, Eye, Edit } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function StaffOverview() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_STAFF as Staff[];
      const { data, error } = await supabase.from('staff').select('*').order('staff_code');
      if (error) throw error;
      return data as Staff[];
    },
  });

  const filteredStaff = staff.filter((person) => {
    const matchesSearch =
      person.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (person.staff_code || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || person.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const total = staff.length;
  const active = staff.filter((s) => s.status === 'Active').length;

  const StatusBadge = ({ status }: { status: string | null }) => {
    const colors: Record<string, string> = {
      Active: 'bg-green-100 text-green-700',
      Inactive: 'bg-red-100 text-red-700',
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
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Staff</h2>
        <Button asChild>
          <Link to="/staff/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card className="p-4 flex flex-col justify-center">
          <p className="text-sm font-medium text-muted-foreground">Total Staff</p>
          <p className="text-2xl font-bold mt-1">{total}</p>
        </Card>
        <Card className="p-4 flex flex-col justify-center">
          <p className="text-sm font-medium text-muted-foreground">Active</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{active}</p>
        </Card>
        <Card className="p-4 flex flex-col justify-center">
          <p className="text-sm font-medium text-muted-foreground">Inactive</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{total - active}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border bg-white flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or staff code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-gray-50/50"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto ml-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 border-b border-border">
              <tr>
                <th className="px-6 py-3 font-medium">Staff Code</th>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Designation</th>
                <th className="px-6 py-3 font-medium">Mobile</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading staff...</td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No staff found matching your filters.</td>
                </tr>
              ) : (
                filteredStaff.map((person) => (
                  <tr key={person.id} className="border-b border-border hover:bg-gray-50/50 transition-colors last:border-0">
                    <td className="px-6 py-4 font-medium text-foreground">{person.staff_code}</td>
                    <td className="px-6 py-4 font-medium text-foreground">{person.full_name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">
                        {person.designation || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{person.mobile || '-'}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={person.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => navigate(`/staff/${person.id}`)}>
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

const MOCK_STAFF: Partial<Staff>[] = [
  { id: '1', staff_code: 'SITST2601', full_name: 'Sonali Alika', designation: 'Teacher', mobile: '89550 65059', status: 'Active' },
  { id: '2', staff_code: 'SITST2602', full_name: 'Vaishali Sharma', designation: 'Teacher', mobile: '86190 78146', status: 'Active' },
  { id: '3', staff_code: 'SITST2603', full_name: 'Meena Rana', designation: 'Helper', mobile: '91163 36137', status: 'Active' },
];
