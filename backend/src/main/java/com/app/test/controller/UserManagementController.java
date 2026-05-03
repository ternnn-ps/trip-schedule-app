package com.app.test.controller;

import com.app.test.beans.dto.request.UserLoginRequest;
import com.app.test.beans.dto.request.UserLocationRequest;
import com.app.test.beans.dto.request.UserRequest;
import com.app.test.beans.dto.response.UserResponse;
import com.app.test.beans.dto.response.base.ResponseModelDto;
import com.app.test.service.UserManagementService;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/user")
@Log4j2
@CrossOrigin("*")
public class UserManagementController {

    @Autowired
    private UserManagementService userService;

    @GetMapping("/search")
    public ResponseEntity<Object> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) List<String> sort
    ) {

        return ResponseEntity.ok(userService.search(keyword, page, size, sort));
    }


    @PostMapping("/create")
    public ResponseEntity<Object> create(@RequestBody UserRequest request){
        log.info("Controller : create User");
        log.debug(request.toString());

        try {
            ResponseModelDto<UserResponse> result = userService.create(request);
            return ResponseEntity.ok(result);

        } catch (Exception ex) {
            return ResponseEntity.internalServerError().body(
                    new ResponseModelDto<>(
                            ex.getClass().getName(),
                            ex.getMessage(),
                            null,
                            false
                    )
            );
        }
    }

    @PutMapping("/update")
    public ResponseEntity<Object> update(@RequestBody UserRequest request) {
        return ResponseEntity.ok(userService.update(request));
    }

    @PostMapping("/location")
    public ResponseEntity<Object> updateLocation(@RequestBody UserLocationRequest request) {
        return ResponseEntity.ok(userService.updateLocation(request));
    }

    @PostMapping("/login")
    public ResponseEntity<Object> login(@RequestBody UserLoginRequest request) {
        return ResponseEntity.ok(userService.login(request));
    }

    @PostMapping("/delete")
    public ResponseEntity<Object> delete(@RequestBody UserRequest request){
        log.info("Controller : delete User");
        log.debug(request.toString());

        try {
            ResponseModelDto<UserResponse> result = userService.delete(request);
            return ResponseEntity.ok(result);

        } catch (Exception ex) {
            return ResponseEntity.internalServerError().body(
                    new ResponseModelDto<>(
                            ex.getClass().getName(),
                            ex.getMessage(),
                            null,
                            false
                    )
            );
        }
    }
}
