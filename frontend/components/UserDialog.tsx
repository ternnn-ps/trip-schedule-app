"use client";

import { UserService } from "@/services/UserService";
import { User } from "@/types/user";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

const service = new UserService();

type FormErrors = Partial<Record<keyof User, string>>;

type UserDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  data: User | null;
};

const emptyForm: User = {
  userName: "",
  userFullName: "",
  email: "",
  phone: "",
  website: "",
};

export default function UserDialog({
  open,
  onClose,
  onSuccess,
  data,
}: UserDialogProps) {
  const [form, setForm] = useState<User>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(
      data
        ? {
            userId: data.userId,
            userName: data.userName ?? "",
            userFullName: data.userFullName ?? "",
            email: data.email ?? "",
            phone: data.phone ?? "",
            website: data.website ?? "",
          }
        : emptyForm
    );
    setErrors({});
    setSubmitError("");
  }, [data, open]);

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!form.userName.trim()) {
      nextErrors.userName = "Username is required.";
    }

    if (!form.userFullName.trim()) {
      nextErrors.userFullName = "Full name is required.";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (form.website && !/^https?:\/\/|^[\w.-]+\.[a-z]{2,}$/i.test(form.website)) {
      nextErrors.website = "Use a valid website URL or domain.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const updateField = (field: keyof User, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setSubmitError("");
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      setSaving(true);
      setSubmitError("");

      const payload: User = {
        ...form,
        userName: form.userName.trim(),
        userFullName: form.userFullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        website: form.website.trim(),
      };

      const response = payload.userId
        ? await service.update(payload)
        : await service.create(payload);

      if (!response?.result) {
        setSubmitError(response?.msgDetail || "The server could not save this user.");
        return;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Server error:", error);
      setSubmitError("The request failed. Please check the API and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 0.5, fontWeight: 700 }}>
        {form.userId ? "Edit user" : "Create user"}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2.25} sx={{ mt: 1 }}>
          <Typography color="text.secondary">
            Keep account details accurate so search, outreach, and ownership stay clean.
          </Typography>

          {submitError ? <Alert severity="error">{submitError}</Alert> : null}

          <TextField
            label="Username"
            value={form.userName}
            error={Boolean(errors.userName)}
            helperText={errors.userName || "Required"}
            onChange={(event) => updateField("userName", event.target.value)}
            fullWidth
          />

          <TextField
            label="Full name"
            value={form.userFullName}
            error={Boolean(errors.userFullName)}
            helperText={errors.userFullName || "Required"}
            onChange={(event) => updateField("userFullName", event.target.value)}
            fullWidth
          />

          <TextField
            label="Email"
            value={form.email}
            error={Boolean(errors.email)}
            helperText={errors.email || "Required"}
            onChange={(event) => updateField("email", event.target.value)}
            fullWidth
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Phone"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              fullWidth
            />

            <TextField
              label="Website"
              value={form.website}
              error={Boolean(errors.website)}
              helperText={errors.website || "Optional"}
              onChange={(event) => updateField("website", event.target.value)}
              fullWidth
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : form.userId ? "Save changes" : "Create user"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
