package com.app.test.controller;

import com.app.test.beans.dto.request.CustomerRequest;
import com.app.test.beans.dto.response.CustomerResponse;
import com.app.test.beans.dto.response.UserResponse;
import com.app.test.beans.dto.response.base.ResponseModelDto;
import com.app.test.model.MsCustomer;
import com.app.test.service.CustomerService;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/customer")
@Log4j2
@CrossOrigin("*")
public class CustomerController {

    @Autowired
    private CustomerService customerService;

    @GetMapping("/search")
    public ResponseEntity<Object> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {

        return ResponseEntity.ok(customerService.search(keyword, page, size));
    }

    @PostMapping("/create")
    public ResponseEntity<Object> create(@RequestBody CustomerRequest request){
        log.info("Controller : create Customer");
        log.debug(request.toString());

        UserResponse response = new UserResponse();
        try {
            ResponseModelDto<MsCustomer> result = customerService.create(request);
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
    public ResponseEntity<Object> update(@RequestBody CustomerRequest request) {
        log.info("Controller : update Customer");
        log.debug(request.toString());

        return ResponseEntity.ok(customerService.update(request));
    }

    @PostMapping("/delete")
    public ResponseEntity<Object> delete(@RequestBody CustomerRequest request){
        log.info("Controller : delete Customer");
        log.debug(request.toString());

        CustomerResponse response = new CustomerResponse();
        try {
            ResponseModelDto<MsCustomer> result = customerService.delete(request);
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
