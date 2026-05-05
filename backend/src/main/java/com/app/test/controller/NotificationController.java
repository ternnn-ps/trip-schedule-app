package com.app.test.controller;

import com.app.test.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping
    public Object list(@RequestParam String userName) {
        return notificationService.list(userName);
    }

    @PostMapping("/{id}/read")
    public Object markRead(@PathVariable String id) {
        return notificationService.markRead(id);
    }

    @PostMapping("/read-all")
    public Object markAllRead(@RequestParam String userName) {
        return notificationService.markAllRead(userName);
    }
}
