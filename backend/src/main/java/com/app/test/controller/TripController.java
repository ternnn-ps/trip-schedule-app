package com.app.test.controller;

import com.app.test.beans.dto.request.TripPlanRequest;
import com.app.test.beans.dto.request.TripRequest;
import com.app.test.beans.dto.request.TripUserRequest;
import com.app.test.service.TripService;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/trip")
@Log4j2
@CrossOrigin("*")
public class TripController {

    @Autowired
    private TripService tripService;

    @GetMapping("/search")
    public ResponseEntity<Object> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(tripService.search(keyword, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> getById(@PathVariable String id) {
        return ResponseEntity.ok(tripService.getById(id));
    }

    @PostMapping("/create")
    public ResponseEntity<Object> create(@RequestBody TripRequest request) {
        log.info("Controller : create Trip");
        log.debug(request.toString());

        return ResponseEntity.ok(tripService.create(request));
    }

    @PutMapping("/update")
    public ResponseEntity<Object> update(@RequestBody TripRequest request) {
        log.info("Controller : update Trip");
        log.debug(request.toString());

        return ResponseEntity.ok(tripService.update(request));
    }

    @PostMapping("/delete")
    public ResponseEntity<Object> delete(@RequestBody TripRequest request) {
        log.info("Controller : delete Trip");
        log.debug(request.toString());

        return ResponseEntity.ok(tripService.delete(request.getId()));
    }

    @PostMapping("/{tripId}/users")
    public ResponseEntity<Object> addUser(@PathVariable String tripId, @RequestBody TripUserRequest request) {
        log.info("Controller : add Trip User");
        log.debug(request.toString());

        return ResponseEntity.ok(tripService.addUser(tripId, request.getUserName()));
    }

    @PostMapping("/{tripId}/plans")
    public ResponseEntity<Object> addPlan(@PathVariable String tripId, @RequestBody TripPlanRequest request) {
        log.info("Controller : add Trip Plan");
        log.debug(request.toString());

        return ResponseEntity.ok(tripService.addPlan(tripId, request));
    }

    @PutMapping("/{tripId}/plans/{planId}")
    public ResponseEntity<Object> updatePlan(
            @PathVariable String tripId,
            @PathVariable String planId,
            @RequestBody TripPlanRequest request
    ) {
        log.info("Controller : update Trip Plan");
        log.debug(request.toString());

        return ResponseEntity.ok(tripService.updatePlan(tripId, planId, request));
    }

    @PostMapping("/{tripId}/plans/{planId}/delete")
    public ResponseEntity<Object> deletePlan(@PathVariable String tripId, @PathVariable String planId) {
        log.info("Controller : delete Trip Plan");

        return ResponseEntity.ok(tripService.deletePlan(tripId, planId));
    }
}
