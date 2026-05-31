import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

const Users = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingUserId, setConfirmingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.admin.listUsers();

      if (error) throw error;

      setUsers(data.users as UserData[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const confirmUserEmail = async (userId: string) => {
    try {
      setConfirmingUserId(userId);

      const { data, error } = await supabase.functions.invoke('confirm-user-email', {
        body: { userId },
      });

      if (error) throw error;

      toast.success('Email confirmado exitosamente');
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error confirming email:', error);
      toast.error('Error al confirmar el email');
    } finally {
      setConfirmingUserId(null);
    }
  };

  if (authLoading || !isAdmin) {
    return null;
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead>Último inicio</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      {user.email_confirmed_at ? (
                        <Badge variant="default" className="flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          Confirmado
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <XCircle className="h-3 w-3" />
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('es-AR')}
                    </TableCell>
                    <TableCell>
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString('es-AR')
                        : 'Nunca'}
                    </TableCell>
                    <TableCell>
                      {!user.email_confirmed_at && (
                        <Button
                          size="sm"
                          onClick={() => confirmUserEmail(user.id)}
                          disabled={confirmingUserId === user.id}
                        >
                          {confirmingUserId === user.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Confirmando...
                            </>
                          ) : (
                            'Confirmar Email'
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
};

export default Users;
